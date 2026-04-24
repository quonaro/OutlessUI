export const DEFAULT_PROBE_STATUSES: Array<'healthy' | 'unhealthy' | 'unknown'> = ['unknown', 'unhealthy', 'healthy']
export type ProbeMode = 'normal' | 'fast'

export function normalizeProbeStatuses(input: Array<'healthy' | 'unhealthy' | 'unknown'> | string[]): Array<'healthy' | 'unhealthy' | 'unknown'> {
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

export function normalizeProbeMode(mode: unknown): ProbeMode {
  return String(mode).toLowerCase().trim() === 'fast' ? 'fast' : 'normal'
}
