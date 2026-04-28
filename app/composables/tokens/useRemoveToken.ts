import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { removeToken } from '~/utils/services/token'

export function useRemoveToken(
  options?: UseMutationOptions<void, Error, string>,
) {
  return useMutation({
    mutationFn: (id: string) => removeToken(id),
    onSuccess: () => {
      toast.success('Токен успешно удален')
    },
    onError: (err) => {
      toast.error('Ошибка удаления токена', {
        description: err.message,
      })
    },
    ...options,
  })
}
