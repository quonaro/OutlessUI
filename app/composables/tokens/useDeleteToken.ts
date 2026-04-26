import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { deactivateToken } from '~/utils/services/token'

export function useDeleteToken(
  options?: UseMutationOptions<void, Error, string>
) {
  return useMutation({
    mutationFn: (id: string) => deactivateToken(id),
    ...options,
  })
}
