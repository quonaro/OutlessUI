import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { login } from '~/utils/services/auth'
import type { LoginCredentials, AuthResponse } from '~/utils/schemas/auth'

export function useLogin(
  options?: UseMutationOptions<AuthResponse, Error, LoginCredentials>
) {
  return useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      login(credentials),
    onSuccess: () => {
      toast.success('Успешный вход в систему')
    },
    onError: (err) => {
      toast.error('Ошибка входа', {
        description: err.message,
      })
    },
    ...options,
  })
}
