import { ref } from 'vue'
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
  const syncingNodes = ref<Map<string, SyncNodeStatus>>(new Map())

  let source: EventSource | null = null

  function startSync() {
    stopSync()
    isSyncing.value = true
    error.value = ''
    syncedAt.value = ''
    syncingNodes.value = new Map()

    source = syncGroupStream(groupId, baseURL, {
      onNodeStatus: (event: GroupSyncNodeEvent) => {
        const next = new Map(syncingNodes.value)
        next.set(event.node_id, event)
        syncingNodes.value = next
      },
      onDone: (event) => {
        syncedAt.value = event.synced_at
        isSyncing.value = false
        stopSync()
      },
      onError: (message) => {
        error.value = message
      },
    })
  }

  function stopSync() {
    if (source) {
      source.close()
      source = null
    }
  }

  return {
    isSyncing,
    error,
    syncedAt,
    syncingNodes,
    startSync,
    stopSync,
  }
}
