import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { updateAdmin } from '~/utils/services/admin'
import type { Admin, UpdateAdmin } from '~/utils/schemas/admin'

export function useUpdateAdmin(
  options?: UseMutationOptions<Admin, Error, { id: string; admin: UpdateAdmin }>
) {
  const config = useRuntimeConfig()
  const backendUrl = config.private.backendUrl as string

  return useMutation({
    mutationFn: ({ id, admin }: { id: string; admin: UpdateAdmin }) =>
      updateAdmin(id, admin, backendUrl),
    ...options,
  })
}
