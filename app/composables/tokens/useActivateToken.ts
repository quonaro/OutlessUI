import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { activateToken } from '~/utils/services/token'

export function useActivateToken(
  options?: UseMutationOptions<void, Error, string>
) {
  const config = useRuntimeConfig()
  const backendUrl = config.public.apiBase as string

  return useMutation({
    mutationFn: (id: string) => activateToken(id, backendUrl),
    ...options,
  })
}
