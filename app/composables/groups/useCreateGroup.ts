import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { createGroup } from '~/utils/services/group'
import type { Group, CreateGroup } from '~/utils/schemas/group'

export function useCreateGroup(
  options?: UseMutationOptions<Group, Error, CreateGroup>
) {
  const config = useRuntimeConfig()
  const backendUrl = config.public.apiBase as string

  return useMutation({
    mutationFn: (group: CreateGroup) => createGroup(group, backendUrl),
    ...options,
  })
}
