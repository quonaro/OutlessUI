import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { deactivateToken } from '~/utils/services/token'

export function useDeleteToken(
  options?: UseMutationOptions<void, Error, string>
) {
  return useMutation({
    mutationFn: (id: string) => deactivateToken(id),
    onSuccess: () => {
      toast.success('Токен успешно деактивирован')
    },
    onError: (err) => {
      toast.error('Ошибка деактивации токена', {
        description: err.message,
      })
    },
    ...options,
  })
}
