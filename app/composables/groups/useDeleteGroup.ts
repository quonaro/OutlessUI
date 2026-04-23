import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { deleteGroup } from '~/utils/services/group'

export function useDeleteGroup(
  options?: UseMutationOptions<void, Error, string>
) {
  const config = useRuntimeConfig()
  const backendUrl = config.public.apiBase as string

  return useMutation({
    mutationFn: (id: string) => deleteGroup(id, backendUrl),
    ...options,
  })
}
