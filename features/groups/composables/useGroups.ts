import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query"
import { fetchGroups, createGroup, updateGroup, deleteGroup } from "../services/group"
import type { CreateGroup } from "../schemas/group"

export function useGroups() {
  const queryClient = useQueryClient()

  const { data: groups, isPending, isError } = useQuery({
    queryKey: ["groups"],
    queryFn: fetchGroups,
  })

  const { mutate: createGroupMutate, isPending: isCreating } = useMutation({
    mutationFn: (data: CreateGroup) => createGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] })
    },
  })

  const { mutate: updateGroupMutate, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateGroup }) => updateGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] })
    },
  })

  const { mutate: deleteGroupMutate, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] })
    },
  })

  return {
    groups,
    isPending,
    isError,
    createGroup: createGroupMutate,
    isCreating,
    updateGroup: updateGroupMutate,
    isUpdating,
    deleteGroup: deleteGroupMutate,
    isDeleting,
  }
}
