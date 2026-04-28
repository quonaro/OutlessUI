import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { createToken } from '~/utils/services/token'
import type { CreateToken, IssuedToken } from '~/utils/schemas/token'

export function useCreateToken(
  options?: UseMutationOptions<IssuedToken, Error, CreateToken>,
) {
  return useMutation({
    mutationFn: (token: CreateToken) => createToken(token),
    onSuccess: () => {
      toast.success('Токен успешно создан')
    },
    onError: (err) => {
      toast.error('Ошибка создания токена', {
        description: err.message,
      })
    },
    ...options,
  })
}
