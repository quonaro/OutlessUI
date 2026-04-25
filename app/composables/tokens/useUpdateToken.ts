import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { updateToken } from '~/utils/services/token'
import type { UpdateToken } from '~/utils/schemas/token'

export function useUpdateToken(
  options?: UseMutationOptions<void, Error, { id: string; token: UpdateToken }>,
) {
  const config = useRuntimeConfig()
  const backendUrl = config.public.apiBase as string

  return useMutation({
    mutationFn: ({ id, token }: { id: string; token: UpdateToken }) =>
      updateToken(id, token, backendUrl),
    ...options,
  })
}
