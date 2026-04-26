import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { createToken } from '~/utils/services/token'
import type { CreateToken, IssuedToken } from '~/utils/schemas/token'

export function useCreateToken(
  options?: UseMutationOptions<IssuedToken, Error, CreateToken>,
) {
  return useMutation({
    mutationFn: (token: CreateToken) => createToken(token),
    ...options,
  })
}
