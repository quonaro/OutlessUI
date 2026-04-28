import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { deletePublicSource } from '~/utils/services/public-source'

export function useDeletePublicSource(
  options?: UseMutationOptions<void, Error, string>
) {
  return useMutation({
    mutationFn: (id: string) => deletePublicSource(id),
    onSuccess: () => {
      toast.success('Public source успешно удален')
    },
    onError: (err) => {
      toast.error('Ошибка удаления public source', {
        description: err.message,
      })
    },
    ...options,
  })
}
