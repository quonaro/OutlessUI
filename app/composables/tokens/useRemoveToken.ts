import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { removeToken } from '~/utils/services/token'

export function useRemoveToken(
  options?: UseMutationOptions<void, Error, string>,
) {
  return useMutation({
    mutationFn: (id: string) => removeToken(id),
    ...options,
  })
}
