import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { deletePublicSource } from '~/utils/services/public-source'

export function useDeletePublicSource(
  options?: UseMutationOptions<void, Error, string>
) {
  return useMutation({
    mutationFn: (id: string) => deletePublicSource(id),
    ...options,
  })
}
