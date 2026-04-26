import { useQuery, type UseQueryOptions } from '@tanstack/vue-query'
import { getFirstAdminStatus } from '~/utils/services/auth'
import type { FirstAdminStatus } from '~/utils/schemas/auth'

export function useFirstAdminStatus(
  options?: UseQueryOptions<FirstAdminStatus, Error>
) {
  return useQuery({
    queryKey: ['first-admin-status'],
    queryFn: () => getFirstAdminStatus(),
    ...options,
  })
}
