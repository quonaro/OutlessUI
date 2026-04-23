import { ref, shallowRef } from 'vue'
import { syncGroupStream, type GroupSyncNodeEvent } from '~/utils/services/group'

export interface SyncNodeStatus {
  node_id: string
  url: string
  status: 'importing' | 'done' | 'unavailable' | 'error'
  latency_ms: number
  error?: string
}

export function useGroupSync(groupId: string) {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBase as string
  const isSyncing = ref(false)
  const error = ref('')
  const syncedAt = ref('')
  const deletedUnavailableCount = ref(0)
  const isCancelled = ref(false)
  const syncingNodes = shallowRef<Map<string, SyncNodeStatus>>(new Map())

  let source: EventSource | null = null

  function startSync() {
    stopSync()
    isSyncing.value = true
    isCancelled.value = false
    error.value = ''
    syncedAt.value = ''
    deletedUnavailableCount.value = 0
    syncingNodes.value = new Map()

    source = syncGroupStream(groupId, baseURL, {
      onNodeStatus: (event: GroupSyncNodeEvent) => {
        const next = new Map(syncingNodes.value)
        next.set(event.node_id, event)
        syncingNodes.value = next
      },
      onDone: (event) => {
        syncedAt.value = event.synced_at
        deletedUnavailableCount.value = event.deleted_unavailable_count ?? 0
        isSyncing.value = false
        stopSync()
      },
      onError: (message) => {
        error.value = message
        isSyncing.value = false
        stopSync()
      },
    })
  }

  function stopSync() {
    if (source) {
      source.close()
      source = null
    }
  }

  function cancelSync() {
    if (!isSyncing.value) return
    isCancelled.value = true
    isSyncing.value = false
    stopSync()
  }

  return {
    isSyncing,
    isCancelled,
    error,
    syncedAt,
    deletedUnavailableCount,
    syncingNodes,
    startSync,
    cancelSync,
    stopSync,
  }
}
