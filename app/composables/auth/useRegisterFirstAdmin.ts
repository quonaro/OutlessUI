import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { registerFirstAdmin } from '~/utils/services/auth'
import type { LoginCredentials, AuthResponse } from '~/utils/schemas/auth'

export function useRegisterFirstAdmin(
  options?: UseMutationOptions<AuthResponse, Error, LoginCredentials>
) {
  return useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      registerFirstAdmin(credentials),
    onSuccess: () => {
      toast.success('Admin registered successfully')
    },
    onError: (err) => {
      toast.error('Failed to register admin', {
        description: err.message,
      })
    },
    ...options,
  })
}
