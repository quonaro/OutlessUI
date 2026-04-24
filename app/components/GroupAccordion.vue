<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { Group } from '~/utils/schemas/group'
import type { Node, NodeStatus } from '~/utils/schemas/node'
import { useProbeJobNodePatch } from '~/composables/nodes/useProbeJobNodePatch'
import { deleteNode, probeNode } from '~/utils/services/node'
import { deleteUnavailableGroupNodes, updateGroup } from '~/utils/services/group'
import { useGroupSync } from '~/composables/groups/useGroupSync'
import { useGroupAccordionFilters } from '~/composables/groups/useGroupAccordionFilters'
import GroupAccordionItem from '~/components/GroupAccordionItem.vue'
import { onAdminRealtimeOpen } from '~/utils/admin-realtime'

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
const { trackProbeJob, stopAllPolling } = useProbeJobNodePatch(baseURL)
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
  mutationFn: ({ id, mode, probeURL }: { id: string, mode: 'normal' | 'fast', probeURL?: string }) => probeNode(id, baseURL, mode, probeURL),
  onSuccess: (result, variables) => {
    const targetNodeID = result.nodeID || variables.id
    if (result.jobID) {
      trackProbeJob(targetNodeID, result.jobID, {
        onFinish: () => {
          const current = new Set(probingNodeIDs.value)
          current.delete(targetNodeID)
          probingNodeIDs.value = current
        },
      })
      return
    }
    const current = new Set(probingNodeIDs.value)
    current.delete(targetNodeID)
    probingNodeIDs.value = current
  },
  onError: (_error, variables) => {
    const current = new Set(probingNodeIDs.value)
    current.delete(variables.id)
    probingNodeIDs.value = current
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
  const state = stateForGroup(groupId)
  const completed = state.probeUnavailableProcessed.value
  let started = 0
  for (const node of state.probingUnavailableNodes.value.values()) {
    if (node.status !== 'queued') started++
  }
  // UX: show visible progress as soon as nodes move from queued -> probing.
  return Math.max(completed, started)
}

function probeUnavailableTotalCount(groupId: string): number {
  return stateForGroup(groupId).probeUnavailableTotal.value
}
function probeUnavailableActiveCount(groupId: string): number {
  return stateForGroup(groupId).probeUnavailableActive.value
}
function probeUnavailableRatePerSec(groupId: string): number {
  return stateForGroup(groupId).probeUnavailableRatePerSec.value
}
function probeUnavailableEtaSec(groupId: string): number | null {
  return stateForGroup(groupId).probeUnavailableEtaSec.value
}
function probeUnavailableStatuses(groupId: string): Array<'healthy' | 'unhealthy' | 'unknown'> {
  return stateForGroup(groupId).probeUnavailableStatuses.value
}
function probeUnavailableMode(groupId: string): 'normal' | 'fast' {
  return stateForGroup(groupId).probeUnavailableMode.value
}
function probeUnavailableProbeURL(groupId: string): string {
  return stateForGroup(groupId).probeUnavailableProbeURL.value
}
function probeNodeStates(groupId: string) {
  return [...stateForGroup(groupId).probingUnavailableNodes.value.values()]
}

function syncInterrupted(group: Group): boolean {
  const st = stateForGroup(group.id)
  return !st.isSyncing.value && st.syncTotal.value > 0 && st.syncProcessed.value < st.syncTotal.value
}

function probeInterrupted(groupId: string): boolean {
  const st = stateForGroup(groupId)
  return !st.isProbingUnavailable.value && st.probeUnavailableTotal.value > 0 && st.probeUnavailableProcessed.value < st.probeUnavailableTotal.value
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
function retryNode(payload: { node: Node, mode: 'normal' | 'fast', probeURL?: string }) {
  const node = payload.node
  const next = new Set(probingNodeIDs.value)
  next.add(node.id)
  probingNodeIDs.value = next
  probeMutation.mutate({ id: node.id, mode: payload.mode, probeURL: payload.probeURL })
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
function probeUnavailable(group: Group, options: { statuses: Array<'healthy' | 'unhealthy' | 'unknown'>, mode: 'normal' | 'fast', probeURL?: string }) {
  stateForGroup(group.id).startProbeUnavailable(options)
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

let stopResyncOnWsOpen: (() => void) | null = null
onMounted(() => {
  if (!import.meta.client) return
  stopResyncOnWsOpen = onAdminRealtimeOpen(() => {
    for (const id of Object.keys(syncStates)) {
      const st = syncStates[id]
      if (!st) continue
      st.requestProbeUnavailableState()
      st.requestSyncState()
    }
  })
})
onBeforeUnmount(() => {
  stopResyncOnWsOpen?.()
  stopResyncOnWsOpen = null
  stopAllPolling()
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
      :country-filter="props.countryFilter"
      :metrics="statusMetricsForGroup(group.id)"
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
      :probe-unavailable-pending="probeUnavailableIsRunning(group.id)"
      :probe-unavailable-processed-count="probeUnavailableProcessedCount(group.id)"
      :probe-unavailable-total-count="probeUnavailableTotalCount(group.id)"
      :probe-unavailable-active-count="probeUnavailableActiveCount(group.id)"
      :probe-unavailable-rate-per-sec="probeUnavailableRatePerSec(group.id)"
      :probe-unavailable-eta-sec="probeUnavailableEtaSec(group.id)"
      :probe-statuses="probeUnavailableStatuses(group.id)"
      :probe-mode="probeUnavailableMode(group.id)"
      :probe-url="probeUnavailableProbeURL(group.id)"
      :probe-nodes="probeNodeStates(group.id)"
      :probe-interrupted="probeInterrupted(group.id)"
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
      @probe-unavailable="(options) => probeUnavailable(group, options)"
      @remove-node="removeNode"
      @retry-node="retryNode"
    />
  </div>
</template>
