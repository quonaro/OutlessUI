import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { createAdmin } from '~/utils/services/admin'
import type { Admin, CreateAdmin } from '~/utils/schemas/admin'

export function useCreateAdmin(
  options?: UseMutationOptions<Admin, Error, CreateAdmin>
) {
  const config = useRuntimeConfig()
  const backendUrl = config.private.backendUrl as string

  return useMutation({
    mutationFn: (admin: CreateAdmin) => createAdmin(admin, backendUrl),
    ...options,
  })
}
