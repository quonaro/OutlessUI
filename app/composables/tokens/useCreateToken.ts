import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { createToken } from '~/utils/services/token'
import type { Token, CreateToken } from '~/utils/schemas/token'

export function useCreateToken(
  options?: UseMutationOptions<Token, Error, CreateToken>
) {
  const config = useRuntimeConfig()
  const backendUrl = config.public.apiBase as string

  return useMutation({
    mutationFn: (token: CreateToken) => createToken(token, backendUrl),
    ...options,
  })
}
