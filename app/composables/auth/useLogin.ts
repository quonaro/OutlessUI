import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { login } from '~/utils/services/auth'
import type { LoginCredentials, AuthResponse } from '~/utils/schemas/auth'

export function useLogin(
  options?: UseMutationOptions<AuthResponse, Error, LoginCredentials>
) {
  const config = useRuntimeConfig()
  const backendUrl = config.public.apiBase as string

  return useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      login(credentials, backendUrl),
    ...options,
  })
}
