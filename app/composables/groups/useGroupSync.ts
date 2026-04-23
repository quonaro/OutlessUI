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
  error?: string
}

export function useGroupSync(groupId: string) {
  const isSyncing = ref(false)
  const isProbingUnavailable = ref(false)
  const error = ref('')
  const syncTotal = ref(0)
  const syncProcessed = ref(0)
  const probeUnavailableError = ref('')
  const probeUnavailableTotal = ref(0)
  const probeUnavailableProcessed = ref(0)
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
    if (t === 'probe_unavailable_started') {
      if (msg.group_id && msg.group_id !== groupId) return
      isProbingUnavailable.value = true
      probeUnavailableError.value = ''
      probeUnavailableTotal.value = typeof msg.total === 'number' ? msg.total : probeUnavailableTotal.value
      probeUnavailableProcessed.value = typeof msg.processed === 'number' ? msg.processed : 0
      probingUnavailableNodes.value = new Map()
      return
    }
    if (t === 'probe_unavailable_state') {
      const ev = msg as unknown as GroupProbeUnavailableStateEvent & { group_id?: string }
      if (ev.group_id && ev.group_id !== groupId) return
      isProbingUnavailable.value = ev.running
      probeUnavailableTotal.value = ev.total
      probeUnavailableProcessed.value = ev.processed
      const next = new Map<string, ProbeUnavailableNodeStatus>()
      for (const node of ev.nodes ?? []) {
        next.set(node.node_id, {
          node_id: node.node_id,
          url: node.url,
          status: node.status,
          latency_ms: node.latency_ms,
          node_status: node.node_status,
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
        error: ev.error,
      })
      probingUnavailableNodes.value = next
      if (typeof ev.total === 'number') probeUnavailableTotal.value = ev.total
      if (typeof ev.processed === 'number') probeUnavailableProcessed.value = ev.processed
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
      return
    }
    if (t === 'sync_group_state') {
      const ev = msg as unknown as GroupSyncStateEvent & { group_id?: string }
      if (ev.group_id && ev.group_id !== groupId) return
      isSyncing.value = ev.running
      syncProcessed.value = ev.processed
      syncTotal.value = ev.total
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
      isSyncing.value = false
      maybeUnsubscribe()
      return
    }
    if (t === 'sync_error') {
      const errMsg = typeof msg.error === 'string' ? msg.error : 'sync failed'
      if (msg.group_id && msg.group_id !== groupId) return
      error.value = errMsg
      syncTotal.value = typeof msg.total === 'number' ? msg.total : syncTotal.value
      syncProcessed.value = typeof msg.processed === 'number' ? msg.processed : syncProcessed.value
      isSyncing.value = false
      maybeUnsubscribe()
      return
    }
    if (t === 'sync_cancelled') {
      if (msg.group_id && msg.group_id !== groupId) return
      syncTotal.value = typeof msg.total === 'number' ? msg.total : syncTotal.value
      syncProcessed.value = typeof msg.processed === 'number' ? msg.processed : syncProcessed.value
      isCancelled.value = true
      isSyncing.value = false
      maybeUnsubscribe()
    }
  }

  function startSync() {
    isSyncing.value = true
    isCancelled.value = false
    error.value = ''
    syncProcessed.value = 0
    syncTotal.value = 0
    syncedAt.value = ''
    deletedUnavailableCount.value = 0
    syncingNodes.value = new Map()

    ensureSubscribed()
    sendAdminRealtime({ action: 'sync_group', group_id: groupId })
  }

  function startProbeUnavailable() {
    isProbingUnavailable.value = true
    probeUnavailableError.value = ''
    probeUnavailableProcessed.value = 0
    probeUnavailableTotal.value = 0
    probingUnavailableNodes.value = new Map()
    ensureSubscribed()
    sendAdminRealtime({ action: 'probe_unavailable', group_id: groupId })
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
    probeUnavailableError,
    probeUnavailableTotal,
    probeUnavailableProcessed,
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
