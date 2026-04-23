<script setup lang="ts">
import { ref } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { Group } from '~/utils/schemas/group'
import type { Node, NodeStatus } from '~/utils/schemas/node'
import { deleteNode, probeNode } from '~/utils/services/node'
import { deleteUnavailableGroupNodes, updateGroup } from '~/utils/services/group'
import { useGroupSync } from '~/composables/groups/useGroupSync'
import { useGroupAccordionFilters } from '~/composables/groups/useGroupAccordionFilters'
import GroupAccordionItem from '~/components/GroupAccordionItem.vue'

const props = defineProps<{
  groups: Group[]
  search: string
  statusFilter: 'all' | 'healthy' | 'unhealthy' | 'unknown'
  pingFilter: 'all' | 'good' | 'ok' | 'bad'
  /** ISO country code filter; empty = all */
  countryFilter: string
}>()

const queryClient = useQueryClient()
const config = useRuntimeConfig()
const baseURL = config.public.apiBase as string
const syncStates: Record<string, ReturnType<typeof useGroupSync>> = {}
const deletingNodeIDs = ref<Set<string>>(new Set())
const probingNodeIDs = ref<Set<string>>(new Set())
const cleanupGroupIDs = ref<Set<string>>(new Set())
const togglingAutoDeleteGroupIDs = ref<Set<string>>(new Set())

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
  mutationFn: (id: string) => deleteNode(id, baseURL),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['nodes'] })
    queryClient.invalidateQueries({ queryKey: ['groups'] })
  },
})
const probeMutation = useMutation({
  mutationFn: (id: string) => probeNode(id, baseURL),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['nodes'] })
    queryClient.invalidateQueries({ queryKey: ['groups'] })
  },
})
const updateGroupMutation = useMutation({
  mutationFn: ({ id, group }: { id: string, group: { name: string, source_url: string, auto_delete_unavailable: boolean } }) =>
    updateGroup(id, group, baseURL),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
})
const deleteUnavailableMutation = useMutation({
  mutationFn: (groupID: string) => deleteUnavailableGroupNodes(groupID, baseURL),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['nodes'] })
    queryClient.invalidateQueries({ queryKey: ['groups'] })
  },
})
function stateForGroup(groupID: string) {
  if (!syncStates[groupID]) {
    syncStates[groupID] = useGroupSync(groupID)
    syncStates[groupID].requestSyncState()
    syncStates[groupID].requestProbeUnavailableState()
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

function probeUnavailableIsRunning(groupId: string): boolean {
  return stateForGroup(groupId).isProbingUnavailable.value
}

function probeUnavailableProcessedCount(groupId: string): number {
  return stateForGroup(groupId).probeUnavailableProcessed.value
}

function probeUnavailableTotalCount(groupId: string): number {
  return stateForGroup(groupId).probeUnavailableTotal.value
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
      const current = new Set(deletingNodeIDs.value)
      current.delete(node.id)
      deletingNodeIDs.value = current
    },
  })
}
function retryNode(node: Node) {
  const next = new Set(probingNodeIDs.value)
  next.add(node.id)
  probingNodeIDs.value = next
  probeMutation.mutate(node.id, {
    onSettled: () => {
      const current = new Set(probingNodeIDs.value)
      current.delete(node.id)
      probingNodeIDs.value = current
    },
  })
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
function probeUnavailable(group: Group) {
  stateForGroup(group.id).startProbeUnavailable()
}
function canProbeUnavailable(group: Group): boolean {
  return (group.total_nodes ?? 0) > 0
}
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

function nodeProbeState(groupID: string, nodeID: string) {
  return stateForGroup(groupID).probingUnavailableNodes.value.get(nodeID) ?? null
}
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
      :country-filter="props.countryFilter"
      :metrics="statusMetricsForGroup(group.id)"
      :is-syncing="syncIsRunning(group.id)"
      :is-cancelled="syncCancelled(group.id)"
      :sync-error="syncErrorText(group.id)"
      :sync-progress-percent="syncProgressPercent(group)"
      :sync-processed-count="syncProcessedCount(group.id)"
      :sync-total-count="syncTotalCount(group)"
      :sync-added-count="syncAddedCount(group.id)"
      :deleted-unavailable-count="deletedUnavailableCount(group.id)"
      :toggling-auto-delete="togglingAutoDeleteGroupIDs.has(group.id)"
      :cleanup-pending="cleanupGroupIDs.has(group.id)"
      :probe-unavailable-pending="probeUnavailableIsRunning(group.id)"
      :probe-unavailable-processed-count="probeUnavailableProcessedCount(group.id)"
      :probe-unavailable-total-count="probeUnavailableTotalCount(group.id)"
      :can-probe-unavailable="canProbeUnavailable(group)"
      :deleting-ids="deletingNodeIDs"
      :probing-ids="probingNodeIDs"
      :local-healthy="isLocalStatusActive(group.id, 'healthy')"
      :local-unhealthy="isLocalStatusActive(group.id, 'unhealthy')"
      :local-unknown="isLocalStatusActive(group.id, 'unknown')"
      :sync-node-error="(id: string) => nodeSyncError(group.id, id)"
      :probe-node-state="(id: string) => nodeProbeState(group.id, id)"
      @toggle-local-status="(status: NodeStatus, ev: Event) => toggleLocalStatus(group.id, status, ev)"
      @clear-local-filter="(ev: Event) => clearLocalStatusFilter(group.id, ev)"
      @toggle-auto-delete="(checked: boolean) => toggleAutoDelete(group, checked)"
      @start-sync="startSync(group)"
      @cancel-sync="cancelSync(group)"
      @delete-unavailable="deleteUnavailable(group)"
      @probe-unavailable="probeUnavailable(group)"
      @remove-node="removeNode"
      @retry-node="retryNode"
    />
  </div>
</template>
