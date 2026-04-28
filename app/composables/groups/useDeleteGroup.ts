import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { deleteGroup } from '~/utils/services/group'

export function useDeleteGroup(
  options?: UseMutationOptions<void, Error, string>
) {
  return useMutation({
    mutationFn: (id: string) => deleteGroup(id),
    onSuccess: () => {
      toast.success('Группа успешно удалена')
    },
    onError: (err) => {
      toast.error('Ошибка удаления группы', {
        description: err.message,
      })
    },
    ...options,
  })
}
