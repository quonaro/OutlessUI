import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { deleteToken } from '~/utils/services/token'

export function useDeleteToken(
  options?: UseMutationOptions<void, Error, string>
) {
  const config = useRuntimeConfig()
  const backendUrl = config.private.backendUrl as string

  return useMutation({
    mutationFn: (id: string) => deleteToken(id, backendUrl),
    ...options,
  })
}
