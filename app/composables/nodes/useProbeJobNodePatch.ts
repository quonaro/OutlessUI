import { useQueryClient } from '@tanstack/vue-query'
import { fetchNodeByID, fetchProbeJobStatus } from '~/utils/services/node'
import { patchNodeInAllNodeQueries } from '~/utils/query/node-cache'

export function useProbeJobNodePatch(baseURL: string) {
  const queryClient = useQueryClient()
  const pollers = new Map<string, ReturnType<typeof setInterval>>()

  async function patchNode(nodeID: string) {
    const updated = await fetchNodeByID(nodeID, baseURL)
    patchNodeInAllNodeQueries(queryClient, {
      id: updated.id,
      status: updated.status,
      latency_ms: updated.latency_ms,
      country: updated.country,
    })
  }

  function stopPolling(nodeID: string) {
    const timer = pollers.get(nodeID)
    if (timer) {
      clearInterval(timer)
      pollers.delete(nodeID)
    }
  }

  function stopAllPolling() {
    for (const timer of pollers.values()) {
      clearInterval(timer)
    }
    pollers.clear()
  }

  function trackProbeJob(nodeID: string, jobID: string) {
    if (!jobID) return
    stopPolling(nodeID)
    let attempts = 0

    const poll = async () => {
      attempts += 1
      try {
        const job = await fetchProbeJobStatus(jobID, baseURL)
        if (job.status === 'succeeded' || job.status === 'failed') {
          stopPolling(nodeID)
          await patchNode(nodeID || job.nodeID)
          return
        }
      } catch {
        // keep polling transient errors
      }
      if (attempts >= 120) {
        stopPolling(nodeID)
      }
    }

    void poll()
    const timer = setInterval(() => {
      void poll()
    }, 1000)
    pollers.set(nodeID, timer)
  }

  return {
    trackProbeJob,
    stopPolling,
    stopAllPolling,
  }
}

