import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query"
import { fetchAdmins, updateAdmin, deleteAdmin } from "../services/admin"
import type { UpdateAdmin } from "../schemas/admin"

export function useAdmins() {
  const queryClient = useQueryClient()

  const { data: admins, isPending, isError } = useQuery({
    queryKey: ["admins"],
    queryFn: fetchAdmins,
  })

  const { mutate: updateAdminMutate, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAdmin }) => updateAdmin(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] })
    },
  })

  const { mutate: deleteAdminMutate, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => deleteAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] })
    },
  })

  return {
    admins,
    isPending,
    isError,
    updateAdmin: updateAdminMutate,
    isUpdating,
    deleteAdmin: deleteAdminMutate,
    isDeleting,
  }
}
