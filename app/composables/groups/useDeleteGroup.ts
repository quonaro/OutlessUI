import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { deleteGroup } from '~/utils/services/group'

export function useDeleteGroup(
  options?: UseMutationOptions<void, Error, string>
) {
  return useMutation({
    mutationFn: (id: string) => deleteGroup(id),
    ...options,
  })
}
