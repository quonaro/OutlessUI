import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { updateToken } from '~/utils/services/token'
import type { UpdateToken } from '~/utils/schemas/token'

export function useUpdateToken(
  options?: UseMutationOptions<void, Error, { id: string; token: UpdateToken }>,
) {
  return useMutation({
    mutationFn: ({ id, token }: { id: string; token: UpdateToken }) =>
      updateToken(id, token),
    onSuccess: () => {
      toast.success('Токен успешно обновлен')
    },
    onError: (err) => {
      toast.error('Ошибка обновления токена', {
        description: err.message,
      })
    },
    ...options,
  })
}
