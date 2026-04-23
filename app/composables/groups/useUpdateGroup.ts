import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { updateGroup } from '~/utils/services/group'
import type { Group, UpdateGroup } from '~/utils/schemas/group'

export function useUpdateGroup(
  options?: UseMutationOptions<Group, Error, { id: string; group: UpdateGroup }>
) {
  const config = useRuntimeConfig()
  const backendUrl = config.private.backendUrl as string

  return useMutation({
    mutationFn: ({ id, group }: { id: string; group: UpdateGroup }) =>
      updateGroup(id, group, backendUrl),
    ...options,
  })
}
