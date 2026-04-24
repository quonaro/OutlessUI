import type { QueryClient } from '@tanstack/vue-query'
import type { Ref, ShallowRef } from 'vue'
import {
  type GroupProbeUnavailableDoneEvent,
  type GroupProbeUnavailableNodeEvent,
  type GroupProbeUnavailableStateEvent,
  type GroupSyncDoneEvent,
  type GroupSyncNodeEvent,
  type GroupSyncStateEvent,
} from '~/utils/services/group'
import { isProbeStaleIdleIgnoreSuspended, sendAdminRealtime } from '~/utils/admin-realtime'
import { schedulePatchNodeInAllNodeQueries } from '~/utils/query/node-cache'
import type { SyncNodeStatus, ProbeUnavailableNodeStatus } from '~/composables/groups/useGroupSync'

export interface SyncStateRefs {
  isSyncing: Ref<boolean>
  isProbingUnavailable: Ref<boolean>
  error: Ref<string>
  syncTotal: Ref<number>
  syncProcessed: Ref<number>
  syncAddedCount: Ref<number>
  probeUnavailableError: Ref<string>
  probeUnavailableTotal: Ref<number>
  probeUnavailableProcessed: Ref<number>
  probeUnavailableActive: Ref<number>
  probeUnavailableCompleted: Ref<number>
  probeUnavailableRatePerSec: Ref<number>
  probeUnavailableEtaSec: Ref<number | null>
  probeUnavailableStatuses: Ref<Array<'healthy' | 'unhealthy' | 'unknown'>>
  probeUnavailableMode: Ref<'normal' | 'fast'>
  probeUnavailableProbeURL: Ref<string>
  syncedAt: Ref<string>
  deletedUnavailableCount: Ref<number>
  isCancelled: Ref<boolean>
  syncingNodes: ShallowRef<Map<string, SyncNodeStatus>>
  probingUnavailableNodes: ShallowRef<Map<string, ProbeUnavailableNodeStatus>>
}

export function createWsHandler(
  groupId: string,
  refs: SyncStateRefs,
  queryClient: QueryClient,
  clearProbeStateFromStorage: () => void,
  maybeUnsubscribe: () => void,
  requestProbeUnavailableStateWsOnly: () => void,
  refreshAfterSyncJob: () => void,
  normalizeProbeStatuses: (input: Array<'healthy' | 'unhealthy' | 'unknown'> | string[]) => Array<'healthy' | 'unhealthy' | 'unknown'>,
  normalizeProbeMode: (mode: unknown) => 'normal' | 'fast',
) {
  return function handleWsMessage(msg: Record<string, unknown>) {
    const t = msg.type
    if (t === 'sync_started') {
      if (msg.group_id && msg.group_id !== groupId) return
      refs.isSyncing.value = true
      if (typeof msg.total === 'number') refs.syncTotal.value = msg.total
      if (typeof msg.processed === 'number') refs.syncProcessed.value = msg.processed
      if (typeof msg.added_count === 'number') refs.syncAddedCount.value = msg.added_count
      return
    }
    if (t === 'probe_unavailable_started') {
      if (msg.group_id && msg.group_id !== groupId) return
      refs.isProbingUnavailable.value = true
      refs.probeUnavailableError.value = ''
      refs.probeUnavailableTotal.value = typeof msg.total === 'number' ? msg.total : refs.probeUnavailableTotal.value
      refs.probeUnavailableProcessed.value = typeof msg.processed === 'number' ? msg.processed : 0
      refs.probeUnavailableStatuses.value = normalizeProbeStatuses(Array.isArray(msg.statuses) ? msg.statuses : refs.probeUnavailableStatuses.value)
      refs.probeUnavailableMode.value = normalizeProbeMode(msg.mode)
      refs.probeUnavailableProbeURL.value = typeof msg.probe_url === 'string' ? msg.probe_url : ''
      refs.probeUnavailableActive.value = typeof msg.active === 'number' ? msg.active : 0
      refs.probeUnavailableCompleted.value = typeof msg.completed === 'number' ? msg.completed : 0
      refs.probeUnavailableRatePerSec.value = typeof msg.rate_per_sec === 'number' ? msg.rate_per_sec : 0
      refs.probeUnavailableEtaSec.value = typeof msg.eta_sec === 'number' && msg.eta_sec >= 0 ? msg.eta_sec : null
      refs.probingUnavailableNodes.value = new Map()
      return
    }
    if (t === 'probe_unavailable_state') {
      const ev = msg as unknown as GroupProbeUnavailableStateEvent & { group_id?: string }
      if (ev.group_id && ev.group_id !== groupId) return
      applyProbeUnavailableState(ev, refs, normalizeProbeStatuses, normalizeProbeMode, maybeUnsubscribe, requestProbeUnavailableStateWsOnly)
      return
    }
    if (t === 'probe_unavailable_node_status') {
      const ev = msg as unknown as GroupProbeUnavailableNodeEvent & { group_id?: string }
      if (ev.group_id && ev.group_id !== groupId) return
      const next = new Map(refs.probingUnavailableNodes.value)
      next.set(ev.node_id, {
        node_id: ev.node_id,
        url: ev.url,
        status: ev.status,
        latency_ms: ev.latency_ms,
        node_status: ev.node_status,
        country: ev.country,
        error: ev.error,
      })
      refs.probingUnavailableNodes.value = next
      if (typeof ev.total === 'number') refs.probeUnavailableTotal.value = ev.total
      if (typeof ev.processed === 'number') refs.probeUnavailableProcessed.value = ev.processed
      if (typeof ev.active === 'number') refs.probeUnavailableActive.value = ev.active
      if (typeof ev.completed === 'number') refs.probeUnavailableCompleted.value = ev.completed
      if (typeof ev.rate_per_sec === 'number') refs.probeUnavailableRatePerSec.value = ev.rate_per_sec
      if (typeof ev.eta_sec === 'number') refs.probeUnavailableEtaSec.value = ev.eta_sec >= 0 ? ev.eta_sec : null
      schedulePatchNodeInAllNodeQueries(queryClient, {
        id: ev.node_id,
        status: ev.node_status,
        latency_ms: ev.latency_ms,
        country: ev.country,
      })
      return
    }
    if (t === 'probe_unavailable_done') {
      const ev = msg as unknown as GroupProbeUnavailableDoneEvent & { group_id?: string }
      if (ev.group_id && ev.group_id !== groupId) return
      if (typeof ev.total === 'number') refs.probeUnavailableTotal.value = ev.total
      if (typeof ev.processed === 'number') refs.probeUnavailableProcessed.value = ev.processed
      if (typeof ev.active === 'number') refs.probeUnavailableActive.value = ev.active
      if (typeof ev.completed === 'number') refs.probeUnavailableCompleted.value = ev.completed
      if (typeof ev.rate_per_sec === 'number') refs.probeUnavailableRatePerSec.value = ev.rate_per_sec
      if (typeof ev.eta_sec === 'number') refs.probeUnavailableEtaSec.value = ev.eta_sec >= 0 ? ev.eta_sec : null
      refs.isProbingUnavailable.value = false
      clearProbeStateFromStorage()
      maybeUnsubscribe()
      return
    }
    if (t === 'probe_unavailable_error') {
      if (msg.group_id && msg.group_id !== groupId) return
      const errMsg = typeof msg.error === 'string' ? msg.error : 'probe unavailable failed'
      refs.probeUnavailableError.value = errMsg
      refs.probeUnavailableTotal.value = typeof msg.total === 'number' ? msg.total : refs.probeUnavailableTotal.value
      refs.probeUnavailableProcessed.value = typeof msg.processed === 'number' ? msg.processed : refs.probeUnavailableProcessed.value
      refs.probeUnavailableActive.value = typeof msg.active === 'number' ? msg.active : refs.probeUnavailableActive.value
      refs.probeUnavailableCompleted.value = typeof msg.completed === 'number' ? msg.completed : refs.probeUnavailableCompleted.value
      refs.probeUnavailableRatePerSec.value = typeof msg.rate_per_sec === 'number' ? msg.rate_per_sec : refs.probeUnavailableRatePerSec.value
      refs.probeUnavailableEtaSec.value = typeof msg.eta_sec === 'number' ? (msg.eta_sec >= 0 ? msg.eta_sec : null) : refs.probeUnavailableEtaSec.value
      refs.isProbingUnavailable.value = false
      clearProbeStateFromStorage()
      maybeUnsubscribe()
      return
    }
    if (t === 'probe_unavailable_cancelled') {
      if (msg.group_id && msg.group_id !== groupId) return
      refs.probeUnavailableTotal.value = typeof msg.total === 'number' ? msg.total : refs.probeUnavailableTotal.value
      refs.probeUnavailableProcessed.value = typeof msg.processed === 'number' ? msg.processed : refs.probeUnavailableProcessed.value
      refs.probeUnavailableActive.value = typeof msg.active === 'number' ? msg.active : refs.probeUnavailableActive.value
      refs.probeUnavailableCompleted.value = typeof msg.completed === 'number' ? msg.completed : refs.probeUnavailableCompleted.value
      refs.probeUnavailableRatePerSec.value = typeof msg.rate_per_sec === 'number' ? msg.rate_per_sec : refs.probeUnavailableRatePerSec.value
      refs.probeUnavailableEtaSec.value = typeof msg.eta_sec === 'number' ? (msg.eta_sec >= 0 ? msg.eta_sec : null) : refs.probeUnavailableEtaSec.value
      refs.isProbingUnavailable.value = false
      clearProbeStateFromStorage()
      maybeUnsubscribe()
      return
    }
    if (t === 'sync_node_status') {
      const ev = msg as unknown as GroupSyncNodeEvent & { group_id?: string }
      if (ev.group_id && ev.group_id !== groupId) return
      const next = new Map(refs.syncingNodes.value)
      next.set(ev.node_id, {
        node_id: ev.node_id,
        url: ev.url,
        status: ev.status,
        latency_ms: ev.latency_ms,
        error: ev.error,
      })
      refs.syncingNodes.value = next
      if (typeof ev.total === 'number') refs.syncTotal.value = ev.total
      if (typeof ev.processed === 'number') refs.syncProcessed.value = ev.processed
      if (typeof ev.added_total === 'number') refs.syncAddedCount.value = ev.added_total
      return
    }
    if (t === 'sync_group_state') {
      const ev = msg as unknown as GroupSyncStateEvent & { group_id?: string }
      if (ev.group_id && ev.group_id !== groupId) return
      refs.isSyncing.value = ev.running
      refs.syncProcessed.value = ev.processed
      refs.syncTotal.value = ev.total
      if (typeof ev.added_count === 'number') refs.syncAddedCount.value = ev.added_count
      if (ev.error) refs.error.value = ev.error
      if (ev.synced_at) refs.syncedAt.value = ev.synced_at
      if (typeof ev.deleted_unavailable_count === 'number') refs.deletedUnavailableCount.value = ev.deleted_unavailable_count
      const next = new Map<string, SyncNodeStatus>()
      for (const node of ev.nodes ?? []) {
        next.set(node.node_id, {
          node_id: node.node_id,
          url: node.url,
          status: node.status,
          latency_ms: node.latency_ms,
          error: node.error,
        })
      }
      refs.syncingNodes.value = next
      if (!ev.running) {
        maybeUnsubscribe()
      }
      return
    }
    if (t === 'sync_done') {
      const ev = msg as unknown as GroupSyncDoneEvent & { group_id?: string }
      if (ev.group_id && ev.group_id !== groupId) return
      refs.syncedAt.value = ev.synced_at
      refs.deletedUnavailableCount.value = ev.deleted_unavailable_count ?? 0
      if (typeof ev.total === 'number') refs.syncTotal.value = ev.total
      if (typeof ev.processed === 'number') refs.syncProcessed.value = ev.processed
      if (typeof ev.added_count === 'number') refs.syncAddedCount.value = ev.added_count
      refs.isSyncing.value = false
      refreshAfterSyncJob()
      maybeUnsubscribe()
      return
    }
    if (t === 'sync_error') {
      const errMsg = typeof msg.error === 'string' ? msg.error : 'sync failed'
      if (msg.group_id && msg.group_id !== groupId) return
      refs.error.value = errMsg
      refs.syncTotal.value = typeof msg.total === 'number' ? msg.total : refs.syncTotal.value
      refs.syncProcessed.value = typeof msg.processed === 'number' ? msg.processed : refs.syncProcessed.value
      refs.syncAddedCount.value = typeof msg.added_count === 'number' ? msg.added_count : refs.syncAddedCount.value
      refs.isSyncing.value = false
      refreshAfterSyncJob()
      maybeUnsubscribe()
      return
    }
    if (t === 'sync_cancelled') {
      if (msg.group_id && msg.group_id !== groupId) return
      refs.syncTotal.value = typeof msg.total === 'number' ? msg.total : refs.syncTotal.value
      refs.syncProcessed.value = typeof msg.processed === 'number' ? msg.processed : refs.syncProcessed.value
      refs.syncAddedCount.value = typeof msg.added_count === 'number' ? msg.added_count : refs.syncAddedCount.value
      refs.isCancelled.value = true
      refs.isSyncing.value = false
      refreshAfterSyncJob()
      maybeUnsubscribe()
    }
  }
}

function applyProbeUnavailableState(
  ev: GroupProbeUnavailableStateEvent,
  refs: SyncStateRefs,
  normalizeProbeStatuses: (input: Array<'healthy' | 'unhealthy' | 'unknown'> | string[]) => Array<'healthy' | 'unhealthy' | 'unknown'>,
  normalizeProbeMode: (mode: unknown) => 'normal' | 'fast',
  maybeUnsubscribe: () => void,
  requestProbeUnavailableStateWsOnly: () => void,
) {
  const remoteTotal = typeof ev.total === 'number' ? ev.total : 0
  const remoteProcessed = typeof ev.processed === 'number' ? ev.processed : 0
  const nodeCount = Array.isArray(ev.nodes) ? ev.nodes.length : 0
  const looksLikeIdleSnapshot = !ev.running && remoteTotal === 0 && remoteProcessed === 0 && nodeCount === 0
  if (
    looksLikeIdleSnapshot
    && refs.isProbingUnavailable.value
    && !isProbeStaleIdleIgnoreSuspended()
  ) {
    requestProbeUnavailableStateWsOnly()
    return
  }

  refs.isProbingUnavailable.value = ev.running
  refs.probeUnavailableTotal.value = ev.total
  refs.probeUnavailableProcessed.value = ev.processed
  refs.probeUnavailableError.value = ev.error ?? ''
  refs.probeUnavailableStatuses.value = normalizeProbeStatuses(ev.statuses ?? refs.probeUnavailableStatuses.value)
  refs.probeUnavailableMode.value = normalizeProbeMode(ev.mode)
  refs.probeUnavailableProbeURL.value = typeof ev.probe_url === 'string' ? ev.probe_url : refs.probeUnavailableProbeURL.value
  refs.probeUnavailableActive.value = typeof ev.active === 'number' ? ev.active : 0
  refs.probeUnavailableCompleted.value = typeof ev.completed === 'number' ? ev.completed : ev.processed
  refs.probeUnavailableRatePerSec.value = typeof ev.rate_per_sec === 'number' ? ev.rate_per_sec : 0
  refs.probeUnavailableEtaSec.value = typeof ev.eta_sec === 'number' && ev.eta_sec >= 0 ? ev.eta_sec : null
  const next = new Map<string, ProbeUnavailableNodeStatus>()
  for (const node of ev.nodes ?? []) {
    next.set(node.node_id, {
      node_id: node.node_id,
      url: node.url,
      status: node.status,
      latency_ms: node.latency_ms,
      node_status: node.node_status,
      country: node.country,
      error: node.error,
    })
  }
  refs.probingUnavailableNodes.value = next
  if (!ev.running) {
    maybeUnsubscribe()
  }
}
