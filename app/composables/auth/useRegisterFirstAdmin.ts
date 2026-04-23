import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { registerFirstAdmin } from '~/utils/services/auth'
import type { LoginCredentials, AuthResponse } from '~/utils/schemas/auth'

export function useRegisterFirstAdmin(
  options?: UseMutationOptions<AuthResponse, Error, LoginCredentials>
) {
  const config = useRuntimeConfig()
  const backendUrl = config.public.apiBase as string

  return useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      registerFirstAdmin(credentials, backendUrl),
    ...options,
  })
}
