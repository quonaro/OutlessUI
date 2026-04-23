import { useQuery, type UseQueryOptions } from '@tanstack/vue-query'
import { fetchGroups } from '~/utils/services/group'
import type { Group } from '~/utils/schemas/group'

export function useGroups(options?: UseQueryOptions<Group[], Error>) {
  const config = useRuntimeConfig()
  const backendUrl = config.private.backendUrl as string

  return useQuery({
    queryKey: ['groups'],
    queryFn: () => fetchGroups(backendUrl),
    ...options,
  })
}
