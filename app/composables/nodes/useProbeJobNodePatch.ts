interface TrackProbeJobOptions {
  onFinish?: () => void
}

export function useProbeJobNodePatch() {
  function stopPolling(_nodeID: string, _runFinish = true) { }

  function stopAllPolling() { }

  function trackProbeJob(_nodeID: string, _jobID: string, options?: TrackProbeJobOptions) {
    options?.onFinish?.()
  }

  return {
    trackProbeJob,
    stopPolling,
    stopAllPolling,
  }
}

