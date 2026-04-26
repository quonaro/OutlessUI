<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { Group } from '~/utils/schemas/group'
import type { Node, NodeStatus } from '~/utils/schemas/node'
import { deleteNode } from '~/utils/services/node'
import { deleteGroup, deleteUnavailableGroupNodes, updateGroup } from '~/utils/services/group'
import { useGroupSync } from '~/composables/groups/useGroupSync'
import { useGroupAccordionFilters } from '~/composables/groups/useGroupAccordionFilters'
import GroupAccordionItem from '~/components/GroupAccordionItem.vue'
import { onAdminRealtimeOpen } from '~/utils/admin-realtime'

const props = defineProps<{
  groups: Group[]
  search: string
  statusFilter: 'all' | 'healthy' | 'unhealthy' | 'unknown'
  pingFilter: 'all' | 'good' | 'ok' | 'bad'
  selectedNodeIds: Set<string>
}>()

const emit = defineEmits<{
  removeNode: [node: Node]
  addNode: [groupId: string]
  moveNode: [payload: { node: Node, targetGroupId: string }]
  toggleSelection: [nodeId: string]
  duplicateNode: [node: Node]
}>()

const queryClient = useQueryClient()
const syncStates: Record<string, ReturnType<typeof useGroupSync>> = {}
const deletingNodeIDs = ref<Set<string>>(new Set())
const movingNodeIDs = ref<Set<string>>(new Set())
const cleanupGroupIDs = ref<Set<string>>(new Set())
const togglingAutoDeleteGroupIDs = ref<Set<string>>(new Set())
const deletingGroupIDs = ref<Set<string>>(new Set())
const editingGroupIDs = ref<Set<string>>(new Set())

const {
  visibleGroups,
  statusMetricsForGroup,
  toggleLocalStatus,
  isLocalStatusActive,
  clearLocalStatusFilter,
} = useGroupAccordionFilters({
  groups: () => props.groups,
  nodes: () => [],
  search: () => props.search,
  statusFilter: () => props.statusFilter,
  perGroupNodeSource: () => true,
})

const deleteMutation = useMutation({
  mutationFn: (id: string) => deleteNode(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['nodes'] })
    queryClient.invalidateQueries({ queryKey: ['groups'] })
  },
})
const updateGroupMutation = useMutation({
  mutationFn: ({ id, group }: { id: string, group: { name: string, source_url: string, auto_delete_unavailable: boolean, random_enabled: boolean, random_limit?: number | null } }) =>
    updateGroup(id, group),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
})
const deleteUnavailableMutation = useMutation({
  mutationFn: (groupID: string) => deleteUnavailableGroupNodes(groupID),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['nodes'] })
    queryClient.invalidateQueries({ queryKey: ['groups'] })
  },
})
const deleteGroupMutation = useMutation({
  mutationFn: (groupId: string) => deleteGroup(groupId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['groups'] })
    queryClient.invalidateQueries({ queryKey: ['nodes'] })
  },
})
const editGroupMutation = useMutation({
  mutationFn: ({ id, name, source_url, auto_delete_unavailable, random_enabled, random_limit }: { id: string, name: string, source_url: string, auto_delete_unavailable: boolean, random_enabled: boolean, random_limit?: number | null }) =>
    updateGroup(id, { name, source_url, auto_delete_unavailable, random_enabled, random_limit }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
})
function stateForGroup(groupID: string) {
  if (!syncStates[groupID]) {
    syncStates[groupID] = useGroupSync(groupID)
    syncStates[groupID].requestSyncState()
  }
  return syncStates[groupID]
}

function syncIsRunning(groupId: string): boolean {
  return stateForGroup(groupId).isSyncing.value
}
function syncCancelled(groupId: string): boolean {
  return stateForGroup(groupId).isCancelled.value
}
function syncErrorText(groupId: string): string {
  return stateForGroup(groupId).error.value
}

function syncProcessedCount(groupId: string): number {
  return stateForGroup(groupId).syncProcessed.value
}
function syncAddedCount(groupId: string): number {
  return stateForGroup(groupId).syncAddedCount.value
}

function syncTotalCount(group: Group): number {
  const total = stateForGroup(group.id).syncTotal.value
  return total > 0 ? total : (group.total_nodes ?? 0)
}

function syncProgressPercent(group: Group): number {
  const total = syncTotalCount(group)
  if (total <= 0) return 0
  const processed = syncProcessedCount(group.id)
  const pct = Math.floor((processed / total) * 100)
  if (processed > 0 && pct === 0) return 1
  return pct
}

function syncInterrupted(group: Group): boolean {
  const st = stateForGroup(group.id)
  return !st.isSyncing.value && st.syncTotal.value > 0 && st.syncProcessed.value < st.syncTotal.value
}

function startSync(group: Group) {
  stateForGroup(group.id).startSync()
}
function cancelSync(group: Group) {
  stateForGroup(group.id).cancelSync()
}
function removeNode(node: Node) {
  if (!confirm(`Delete node ${node.id}?`)) return
  const next = new Set(deletingNodeIDs.value)
  next.add(node.id)
  deletingNodeIDs.value = next
  deleteMutation.mutate(node.id, {
    onSettled: () => {
      deletingNodeIDs.value.delete(node.id)
    },
  })
}
function retryNode(_payload: { node: Node, mode: 'normal' | 'fast', probeURL?: string }) {}
function handleAddNode(groupId: string) {
  emit('addNode', groupId)
}
function handleMoveNode(payload: { node: Node, targetGroupId: string }) {
  emit('moveNode', payload)
}
function deleteUnavailable(group: Group) {
  if (!confirm(`Delete all unavailable nodes in ${group.name}?`)) return
  const next = new Set(cleanupGroupIDs.value)
  next.add(group.id)
  cleanupGroupIDs.value = next
  deleteUnavailableMutation.mutate(group.id, {
    onSettled: () => {
      const current = new Set(cleanupGroupIDs.value)
      current.delete(group.id)
      cleanupGroupIDs.value = current
    },
  })
}
function probeUnavailable(_group: Group, _options: { statuses: Array<'healthy' | 'unhealthy' | 'unknown'>, mode: 'normal' | 'fast', probeURL?: string }) {}
function canProbeUnavailable(_group: Group): boolean { return false }
function toggleAutoDelete(group: Group, checked: boolean) {
  const next = new Set(togglingAutoDeleteGroupIDs.value)
  next.add(group.id)
  togglingAutoDeleteGroupIDs.value = next
  updateGroupMutation.mutate({
    id: group.id,
    group: {
      name: group.name,
      source_url: group.source_url ?? '',
      auto_delete_unavailable: checked,
      random_enabled: group.random_enabled ?? false,
      random_limit: group.random_limit,
    },
  }, {
    onSettled: () => {
      const current = new Set(togglingAutoDeleteGroupIDs.value)
      current.delete(group.id)
      togglingAutoDeleteGroupIDs.value = current
    },
  })
}
function deletedUnavailableCount(groupID: string): number {
  return stateForGroup(groupID).deletedUnavailableCount.value
}
function nodeSyncError(groupID: string, nodeID: string): string {
  return stateForGroup(groupID).syncingNodes.value.get(nodeID)?.error ?? ''
}
function handleEditGroup(group: { id: string, name: string, source_url: string, random_enabled: boolean, random_limit: number | null }) {
  const existingGroup = props.groups.find(g => g.id === group.id)
  if (!existingGroup) return

  const next = new Set(editingGroupIDs.value)
  next.add(group.id)
  editingGroupIDs.value = next
  editGroupMutation.mutate({
    id: group.id,
    name: group.name,
    source_url: group.source_url,
    auto_delete_unavailable: existingGroup.auto_delete_unavailable ?? false,
    random_enabled: group.random_enabled,
    random_limit: group.random_limit,
  }, {
    onSettled: () => {
      const current = new Set(editingGroupIDs.value)
      current.delete(group.id)
      editingGroupIDs.value = current
    },
  })
}
function handleDeleteGroup(groupId: string) {
  const next = new Set(deletingGroupIDs.value)
  next.add(groupId)
  deletingGroupIDs.value = next
  deleteGroupMutation.mutate(groupId, {
    onSettled: () => {
      const current = new Set(deletingGroupIDs.value)
      current.delete(groupId)
      deletingGroupIDs.value = current
    },
  })
}

function nodeProbeState(groupID: string, nodeID: string) {
  void groupID
  void nodeID
  return null
}

let stopResyncOnWsOpen: (() => void) | null = null
onMounted(() => {
  if (!import.meta.client) return
  stopResyncOnWsOpen = onAdminRealtimeOpen(() => {
    for (const id of Object.keys(syncStates)) {
      const st = syncStates[id]
      if (!st) continue
      st.requestSyncState()
    }
  })
})
onBeforeUnmount(() => {
  stopResyncOnWsOpen?.()
  stopResyncOnWsOpen = null
})
</script>

<template>
  <div class="space-y-3">
    <GroupAccordionItem
      v-for="group in visibleGroups"
      :key="group.id"
      :group="group"
      :search="props.search"
      :status-filter="props.statusFilter"
      :ping-filter="props.pingFilter"
      :metrics="statusMetricsForGroup(group.id)"
      @add-node="handleAddNode"
      @move-node="handleMoveNode"
      @toggle-selection="emit('toggleSelection', $event)"
      @duplicate-node="emit('duplicateNode', $event)"
      :moving-ids="movingNodeIDs"
      :selected-ids="props.selectedNodeIds"
      :all-groups="props.groups"
      :is-syncing="syncIsRunning(group.id)"
      :is-cancelled="syncCancelled(group.id)"
      :sync-error="syncErrorText(group.id)"
      :sync-progress-percent="syncProgressPercent(group)"
      :sync-processed-count="syncProcessedCount(group.id)"
      :sync-total-count="syncTotalCount(group)"
      :sync-interrupted="syncInterrupted(group)"
      :sync-added-count="syncAddedCount(group.id)"
      :deleted-unavailable-count="deletedUnavailableCount(group.id)"
      :toggling-auto-delete="togglingAutoDeleteGroupIDs.has(group.id)"
      :cleanup-pending="cleanupGroupIDs.has(group.id)"
      :editing-group="editingGroupIDs.has(group.id)"
      :deleting-group="deletingGroupIDs.has(group.id)"
      :deleting-ids="deletingNodeIDs"
      :probing-ids="new Set()"
      :local-healthy="isLocalStatusActive(group.id, 'healthy')"
      :local-unhealthy="isLocalStatusActive(group.id, 'unhealthy')"
      :local-unknown="isLocalStatusActive(group.id, 'unknown')"
      :sync-node-error="(id: string) => nodeSyncError(group.id, id)"
      @toggle-local-status="(status: NodeStatus, ev: Event) => toggleLocalStatus(group.id, status, ev)"
      @clear-local-filter="(ev: Event) => clearLocalStatusFilter(group.id, ev)"
      @toggle-auto-delete="(checked: boolean) => toggleAutoDelete(group, checked)"
      @start-sync="startSync(group)"
      @cancel-sync="cancelSync(group)"
      @delete-unavailable="deleteUnavailable(group)"
      @remove-node="removeNode"
      @edit-group="handleEditGroup"
      @delete-group="handleDeleteGroup"
    />
  </div>
</template>
