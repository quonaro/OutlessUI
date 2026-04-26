import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { activateToken } from '~/utils/services/token'

export function useActivateToken(
  options?: UseMutationOptions<void, Error, string>
) {
  return useMutation({
    mutationFn: (id: string) => activateToken(id),
    ...options,
  })
}
