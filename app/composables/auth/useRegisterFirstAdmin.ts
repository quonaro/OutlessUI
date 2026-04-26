import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { registerFirstAdmin } from '~/utils/services/auth'
import type { LoginCredentials, AuthResponse } from '~/utils/schemas/auth'

export function useRegisterFirstAdmin(
  options?: UseMutationOptions<AuthResponse, Error, LoginCredentials>
) {
  return useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      registerFirstAdmin(credentials),
    ...options,
  })
}
