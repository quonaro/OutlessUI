import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { createGroup } from '~/utils/services/group'
import type { Group, CreateGroup } from '~/utils/schemas/group'

export function useCreateGroup(
  options?: UseMutationOptions<Group, Error, CreateGroup>
) {
  return useMutation({
    mutationFn: (group: CreateGroup) => createGroup(group),
    ...options,
  })
}
