import { useQuery, type UseQueryOptions } from '@tanstack/vue-query'
import { fetchAdmins } from '~/utils/services/admin'
import type { Admin } from '~/utils/schemas/admin'

export function useAdmins(options?: UseQueryOptions<Admin[], Error>) {
  const config = useRuntimeConfig()
  const backendUrl = config.public.apiBase as string

  return useQuery({
    queryKey: ['admins'],
    queryFn: () => fetchAdmins(backendUrl),
    ...options,
  })
}
