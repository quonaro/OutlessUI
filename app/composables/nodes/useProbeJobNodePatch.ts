import { useQueryClient } from '@tanstack/vue-query'
import { fetchNodeByID, fetchProbeJobStatus } from '~/utils/services/node'
import { patchNodeInAllNodeQueries } from '~/utils/query/node-cache'

interface TrackProbeJobOptions {
  onFinish?: () => void
}

export function useProbeJobNodePatch(baseURL: string) {
  const queryClient = useQueryClient()
  const pollers = new Map<string, { timer: ReturnType<typeof setInterval>, onFinish?: () => void }>()

  async function patchNode(nodeID: string) {
    const updated = await fetchNodeByID(nodeID, baseURL)
    patchNodeInAllNodeQueries(queryClient, {
      id: updated.id,
      status: updated.status,
      latency_ms: updated.latency_ms,
      country: updated.country,
    })
  }

  function stopPolling(nodeID: string, runFinish = true) {
    const record = pollers.get(nodeID)
    if (record) {
      clearInterval(record.timer)
      pollers.delete(nodeID)
      if (runFinish) {
        record.onFinish?.()
      }
    }
  }

  function stopAllPolling() {
    for (const record of pollers.values()) {
      clearInterval(record.timer)
      record.onFinish?.()
    }
    pollers.clear()
  }

  function trackProbeJob(nodeID: string, jobID: string, options?: TrackProbeJobOptions) {
    if (!jobID) return
    stopPolling(nodeID, false)
    let attempts = 0

    const finishWithPatch = async (resolvedNodeID: string) => {
      stopPolling(nodeID, false)
      await patchNode(resolvedNodeID)
      options?.onFinish?.()
    }

    const poll = async () => {
      attempts += 1
      try {
        const job = await fetchProbeJobStatus(jobID, baseURL)
        if (job.status === 'succeeded' || job.status === 'failed') {
          await finishWithPatch(nodeID || job.nodeID)
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
    pollers.set(nodeID, { timer, onFinish: options?.onFinish })
  }

  return {
    trackProbeJob,
    stopPolling,
    stopAllPolling,
  }
}

