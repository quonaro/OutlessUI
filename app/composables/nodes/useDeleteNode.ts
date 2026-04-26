import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { deleteNode } from '~/utils/services/node'

export function useDeleteNode(
  options?: UseMutationOptions<void, Error, string>
) {
  return useMutation({
    mutationFn: (id: string) => deleteNode(id),
    ...options,
  })
}
