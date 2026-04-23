import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { deleteAdmin } from '~/utils/services/admin'

export function useDeleteAdmin(
  options?: UseMutationOptions<void, Error, string>
) {
  const config = useRuntimeConfig()
  const backendUrl = config.public.apiBase as string

  return useMutation({
    mutationFn: (id: string) => deleteAdmin(id, backendUrl),
    ...options,
  })
}
