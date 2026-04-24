import { useQueryClient } from '@tanstack/vue-query'
import { ref, shallowRef } from 'vue'
import type {
  GroupProbeUnavailableDoneEvent,
  GroupProbeUnavailableNodeEvent,
  GroupProbeUnavailableStateEvent,
  GroupSyncDoneEvent,
  GroupSyncNodeEvent,
  GroupSyncStateEvent,
} from '~/utils/services/group'
import {
  ensureAdminRealtimeConnected,
  sendAdminRealtime,
  subscribeGroupSyncChannel,
} from '~/utils/admin-realtime'
import { patchNodeInAllNodeQueries } from '~/utils/query/node-cache'

export interface SyncNodeStatus {
  node_id: string
  url: string
  status: 'importing' | 'done' | 'unavailable' | 'error'
  latency_ms: number
  error?: string
}

export interface ProbeUnavailableNodeStatus {
  node_id: string
  url: string
  status: 'queued' | 'probing' | 'ready' | 'error'
  latency_ms: number
  node_status?: 'healthy' | 'unhealthy' | 'unknown'
  country?: string
  error?: string
}

const DEFAULT_PROBE_STATUSES: Array<'healthy' | 'unhealthy' | 'unknown'> = ['unknown', 'unhealthy', 'healthy']
type ProbeMode = 'normal' | 'fast'

export function useGroupSync(groupId: string) {
  const queryClient = useQueryClient()

  /** Refresh nodes/groups after source sync jobs (import may add/remove nodes). */
  function refreshAfterSyncJob() {
    void queryClient.invalidateQueries({ queryKey: ['nodes', 'infinite'] })
    void queryClient.invalidateQueries({ queryKey: ['groups'] })
  }

  const isSyncing = ref(false)
  const isProbingUnavailable = ref(false)
  const error = ref('')
  const syncTotal = ref(0)
  const syncProcessed = ref(0)
  const syncAddedCount = ref(0)
  const probeUnavailableError = ref('')
  const probeUnavailableTotal = ref(0)
  const probeUnavailableProcessed = ref(0)
  const probeUnavailableStatuses = ref<Array<'healthy' | 'unhealthy' | 'unknown'>>([...DEFAULT_PROBE_STATUSES])
  const probeUnavailableMode = ref<ProbeMode>('normal')
  const probeUnavailableProbeURL = ref('')
  const syncedAt = ref('')
  const deletedUnavailableCount = ref(0)
  const isCancelled = ref(false)
  const syncingNodes = shallowRef<Map<string, SyncNodeStatus>>(new Map())
  const probingUnavailableNodes = shallowRef<Map<string, ProbeUnavailableNodeStatus>>(new Map())

  let unsubscribe: (() => void) | null = null

  function ensureSubscribed() {
    ensureAdminRealtimeConnected()
    if (!unsubscribe) {
      unsubscribe = subscribeGroupSyncChannel(groupId, handleWsMessage)
    }
  }

  function maybeUnsubscribe() {
    if (isSyncing.value || isProbingUnavailable.value) return
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }

  function handleWsMessage(msg: Record<string, unknown>) {
    const t = msg.type
    if (t === 'sync_started') {
      if (msg.group_id && msg.group_id !== groupId) return
      isSyncing.value = true
      if (typeof msg.total === 'number') syncTotal.value = msg.total
      if (typeof msg.processed === 'number') syncProcessed.value = msg.processed
      if (typeof msg.added_count === 'number') syncAddedCount.value = msg.added_count
      return
    }
    if (t === 'probe_unavailable_started') {
      if (msg.group_id && msg.group_id !== groupId) return
      isProbingUnavailable.value = true
      probeUnavailableError.value = ''
      probeUnavailableTotal.value = typeof msg.total === 'number' ? msg.total : probeUnavailableTotal.value
      probeUnavailableProcessed.value = typeof msg.processed === 'number' ? msg.processed : 0
      probeUnavailableStatuses.value = normalizeProbeStatuses(Array.isArray(msg.statuses) ? msg.statuses : probeUnavailableStatuses.value)
      probeUnavailableMode.value = normalizeProbeMode(msg.mode)
      probeUnavailableProbeURL.value = typeof msg.probe_url === 'string' ? msg.probe_url : ''
      probingUnavailableNodes.value = new Map()
      return
    }
    if (t === 'probe_unavailable_state') {
      const ev = msg as unknown as GroupProbeUnavailableStateEvent & { group_id?: string }
      if (ev.group_id && ev.group_id !== groupId) return
      isProbingUnavailable.value = ev.running
      probeUnavailableTotal.value = ev.total
      probeUnavailableProcessed.value = ev.processed
      probeUnavailableError.value = ev.error ?? ''
      probeUnavailableStatuses.value = normalizeProbeStatuses(ev.statuses ?? probeUnavailableStatuses.value)
      probeUnavailableMode.value = normalizeProbeMode(ev.mode)
      probeUnavailableProbeURL.value = typeof ev.probe_url === 'string' ? ev.probe_url : probeUnavailableProbeURL.value
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
      probingUnavailableNodes.value = next
      if (!ev.running) {
        maybeUnsubscribe()
      }
      return
    }
    if (t === 'probe_unavailable_node_status') {
      const ev = msg as unknown as GroupProbeUnavailableNodeEvent & { group_id?: string }
      if (ev.group_id && ev.group_id !== groupId) return
      const next = new Map(probingUnavailableNodes.value)
      next.set(ev.node_id, {
        node_id: ev.node_id,
        url: ev.url,
        status: ev.status,
        latency_ms: ev.latency_ms,
        node_status: ev.node_status,
        country: ev.country,
        error: ev.error,
      })
      probingUnavailableNodes.value = next
      if (typeof ev.total === 'number') probeUnavailableTotal.value = ev.total
      if (typeof ev.processed === 'number') probeUnavailableProcessed.value = ev.processed
      patchNodeInAllNodeQueries(queryClient, {
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
      if (typeof ev.total === 'number') probeUnavailableTotal.value = ev.total
      if (typeof ev.processed === 'number') probeUnavailableProcessed.value = ev.processed
      isProbingUnavailable.value = false
      maybeUnsubscribe()
      return
    }
    if (t === 'probe_unavailable_error') {
      if (msg.group_id && msg.group_id !== groupId) return
      const errMsg = typeof msg.error === 'string' ? msg.error : 'probe unavailable failed'
      probeUnavailableError.value = errMsg
      probeUnavailableTotal.value = typeof msg.total === 'number' ? msg.total : probeUnavailableTotal.value
      probeUnavailableProcessed.value = typeof msg.processed === 'number' ? msg.processed : probeUnavailableProcessed.value
      isProbingUnavailable.value = false
      maybeUnsubscribe()
      return
    }
    if (t === 'probe_unavailable_cancelled') {
      if (msg.group_id && msg.group_id !== groupId) return
      probeUnavailableTotal.value = typeof msg.total === 'number' ? msg.total : probeUnavailableTotal.value
      probeUnavailableProcessed.value = typeof msg.processed === 'number' ? msg.processed : probeUnavailableProcessed.value
      isProbingUnavailable.value = false
      maybeUnsubscribe()
      return
    }
    if (t === 'sync_node_status') {
      const ev = msg as unknown as GroupSyncNodeEvent & { group_id?: string }
      if (ev.group_id && ev.group_id !== groupId) return
      const next = new Map(syncingNodes.value)
      next.set(ev.node_id, {
        node_id: ev.node_id,
        url: ev.url,
        status: ev.status,
        latency_ms: ev.latency_ms,
        error: ev.error,
      })
      syncingNodes.value = next
      if (typeof ev.total === 'number') syncTotal.value = ev.total
      if (typeof ev.processed === 'number') syncProcessed.value = ev.processed
      if (typeof ev.added_total === 'number') syncAddedCount.value = ev.added_total
      return
    }
    if (t === 'sync_group_state') {
      const ev = msg as unknown as GroupSyncStateEvent & { group_id?: string }
      if (ev.group_id && ev.group_id !== groupId) return
      isSyncing.value = ev.running
      syncProcessed.value = ev.processed
      syncTotal.value = ev.total
      if (typeof ev.added_count === 'number') syncAddedCount.value = ev.added_count
      if (ev.error) error.value = ev.error
      if (ev.synced_at) syncedAt.value = ev.synced_at
      if (typeof ev.deleted_unavailable_count === 'number') deletedUnavailableCount.value = ev.deleted_unavailable_count
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
      syncingNodes.value = next
      if (!ev.running) {
        maybeUnsubscribe()
      }
      return
    }
    if (t === 'sync_done') {
      const ev = msg as unknown as GroupSyncDoneEvent & { group_id?: string }
      if (ev.group_id && ev.group_id !== groupId) return
      syncedAt.value = ev.synced_at
      deletedUnavailableCount.value = ev.deleted_unavailable_count ?? 0
      if (typeof ev.total === 'number') syncTotal.value = ev.total
      if (typeof ev.processed === 'number') syncProcessed.value = ev.processed
      if (typeof ev.added_count === 'number') syncAddedCount.value = ev.added_count
      isSyncing.value = false
      refreshAfterSyncJob()
      maybeUnsubscribe()
      return
    }
    if (t === 'sync_error') {
      const errMsg = typeof msg.error === 'string' ? msg.error : 'sync failed'
      if (msg.group_id && msg.group_id !== groupId) return
      error.value = errMsg
      syncTotal.value = typeof msg.total === 'number' ? msg.total : syncTotal.value
      syncProcessed.value = typeof msg.processed === 'number' ? msg.processed : syncProcessed.value
      syncAddedCount.value = typeof msg.added_count === 'number' ? msg.added_count : syncAddedCount.value
      isSyncing.value = false
      refreshAfterSyncJob()
      maybeUnsubscribe()
      return
    }
    if (t === 'sync_cancelled') {
      if (msg.group_id && msg.group_id !== groupId) return
      syncTotal.value = typeof msg.total === 'number' ? msg.total : syncTotal.value
      syncProcessed.value = typeof msg.processed === 'number' ? msg.processed : syncProcessed.value
      syncAddedCount.value = typeof msg.added_count === 'number' ? msg.added_count : syncAddedCount.value
      isCancelled.value = true
      isSyncing.value = false
      refreshAfterSyncJob()
      maybeUnsubscribe()
    }
  }

  function startSync() {
    isSyncing.value = true
    isCancelled.value = false
    error.value = ''
    syncProcessed.value = 0
    syncTotal.value = 0
    syncAddedCount.value = 0
    syncedAt.value = ''
    deletedUnavailableCount.value = 0
    syncingNodes.value = new Map()

    ensureSubscribed()
    sendAdminRealtime({ action: 'sync_group', group_id: groupId })
  }

  function startProbeUnavailable(options?: { statuses?: Array<'healthy' | 'unhealthy' | 'unknown'>, mode?: ProbeMode, probeURL?: string }) {
    isProbingUnavailable.value = true
    probeUnavailableError.value = ''
    probeUnavailableProcessed.value = 0
    probeUnavailableTotal.value = 0
    probingUnavailableNodes.value = new Map()
    probeUnavailableStatuses.value = normalizeProbeStatuses(options?.statuses ?? probeUnavailableStatuses.value)
    probeUnavailableMode.value = normalizeProbeMode(options?.mode)
    probeUnavailableProbeURL.value = (options?.probeURL ?? '').trim()
    ensureSubscribed()
    sendAdminRealtime({
      action: 'probe_unavailable',
      group_id: groupId,
      statuses: probeUnavailableStatuses.value,
      mode: probeUnavailableMode.value,
      probe_url: probeUnavailableProbeURL.value,
    })
  }

  function requestProbeUnavailableState() {
    ensureSubscribed()
    sendAdminRealtime({ action: 'probe_unavailable_state', group_id: groupId })
  }

  function requestSyncState() {
    ensureSubscribed()
    sendAdminRealtime({ action: 'sync_group_state', group_id: groupId })
  }

  function stopSync() {
    isSyncing.value = false
    maybeUnsubscribe()
  }

  function stopProbeUnavailable() {
    isProbingUnavailable.value = false
    maybeUnsubscribe()
  }

  function cancelSync() {
    if (!isSyncing.value && !isProbingUnavailable.value) return
    sendAdminRealtime({ action: 'cancel_sync', group_id: groupId })
    isCancelled.value = true
    if (isProbingUnavailable.value) {
      stopProbeUnavailable()
    }
    stopSync()
  }

  return {
    isSyncing,
    isProbingUnavailable,
    isCancelled,
    error,
    syncTotal,
    syncProcessed,
    syncAddedCount,
    probeUnavailableError,
    probeUnavailableTotal,
    probeUnavailableProcessed,
    probeUnavailableStatuses,
    probeUnavailableMode,
    probeUnavailableProbeURL,
    syncedAt,
    deletedUnavailableCount,
    syncingNodes,
    probingUnavailableNodes,
    startSync,
    startProbeUnavailable,
    requestSyncState,
    requestProbeUnavailableState,
    cancelSync,
    stopSync,
    stopProbeUnavailable,
  }
}

function normalizeProbeStatuses(input: Array<'healthy' | 'unhealthy' | 'unknown'> | string[]): Array<'healthy' | 'unhealthy' | 'unknown'> {
  const out: Array<'healthy' | 'unhealthy' | 'unknown'> = []
  const seen = new Set<string>()
  for (const raw of input) {
    const item = String(raw).trim().toLowerCase()
    if (item !== 'healthy' && item !== 'unhealthy' && item !== 'unknown') continue
    if (seen.has(item)) continue
    seen.add(item)
    out.push(item)
  }
  return out.length > 0 ? out : [...DEFAULT_PROBE_STATUSES]
}

function normalizeProbeMode(mode: unknown): ProbeMode {
  return String(mode).toLowerCase().trim() === 'fast' ? 'fast' : 'normal'
}
