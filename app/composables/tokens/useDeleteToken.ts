import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { deactivateToken } from '~/utils/services/token'

export function useDeleteToken(
  options?: UseMutationOptions<void, Error, string>
) {
  const config = useRuntimeConfig()
  const backendUrl = config.public.apiBase as string

  return useMutation({
    mutationFn: (id: string) => deactivateToken(id, backendUrl),
    ...options,
  })
}
