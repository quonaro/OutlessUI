import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { deleteNode } from '~/utils/services/node'

export function useDeleteNode(
  options?: UseMutationOptions<void, Error, string>
) {
  return useMutation({
    mutationFn: (id: string) => deleteNode(id),
    onSuccess: () => {
      toast.success('Нода успешно удалена')
    },
    onError: (err) => {
      toast.error('Ошибка удаления ноды', {
        description: err.message,
      })
    },
    ...options,
  })
}
