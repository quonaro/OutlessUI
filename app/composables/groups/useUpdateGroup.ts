import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { updateGroup } from '~/utils/services/group'
import type { UpdateGroup } from '~/utils/schemas/group'

export function useUpdateGroup(
  options?: UseMutationOptions<void, Error, { id: string; group: UpdateGroup }>
) {
  return useMutation({
    mutationFn: ({ id, group }: { id: string; group: UpdateGroup }) =>
      updateGroup(id, group),
    ...options,
  })
}
