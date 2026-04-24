export interface ProbeState {
  isProbingUnavailable: boolean
  probeUnavailableTotal: number
  probeUnavailableProcessed: number
  probeUnavailableActive: number
  probeUnavailableCompleted: number
  probeUnavailableRatePerSec: number
  probeUnavailableEtaSec: number | null
  probeUnavailableStatuses: Array<'healthy' | 'unhealthy' | 'unknown'>
  probeUnavailableMode: 'normal' | 'fast'
  probeUnavailableProbeURL: string
}

let saveProbeStateDebounceTimer: ReturnType<typeof setTimeout> | null = null

export function saveProbeStateToStorage(storageKey: string, state: ProbeState) {
  if (!import.meta.client) return
  // Debounce: wait 500ms before saving to avoid excessive writes
  if (saveProbeStateDebounceTimer) {
    globalThis.clearTimeout(saveProbeStateDebounceTimer)
  }
  saveProbeStateDebounceTimer = globalThis.setTimeout(() => {
    localStorage.setItem(storageKey, JSON.stringify(state))
    saveProbeStateDebounceTimer = null
  }, 500)
}

export function clearProbeStateFromStorage(storageKey: string) {
  if (!import.meta.client) return
  localStorage.removeItem(storageKey)
}

export function loadProbeStateFromStorage(storageKey: string): Partial<ProbeState> | null {
  if (!import.meta.client) return null
  const saved = localStorage.getItem(storageKey)
  if (!saved) return null
  try {
    return JSON.parse(saved)
  }
  catch {
    return null
  }
}
