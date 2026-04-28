import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { activateToken } from '~/utils/services/token'

export function useActivateToken(
  options?: UseMutationOptions<void, Error, string>
) {
  return useMutation({
    mutationFn: (id: string) => activateToken(id),
    onSuccess: () => {
      toast.success('Токен успешно активирован')
    },
    onError: (err) => {
      toast.error('Ошибка активации токена', {
        description: err.message,
      })
    },
    ...options,
  })
}
