import { useQuery, type UseQueryOptions } from '@tanstack/vue-query'
import { fetchStats } from '~/utils/services/stats'
import type { Stats } from '~/utils/schemas/stats'

export function useStats(options?: UseQueryOptions<Stats, Error>) {
  const config = useRuntimeConfig()
  const backendUrl = config.public.apiBase as string

  return useQuery({
    queryKey: ['stats'],
    queryFn: () => fetchStats(backendUrl),
    refetchInterval: 30_000,
    ...options,
  })
}
