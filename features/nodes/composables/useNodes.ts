import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query"
import { fetchNodes, createNode, updateNode, deleteNode } from "../services/node"
import type { CreateNode } from "../schemas/node"

export function useNodes() {
  const queryClient = useQueryClient()

  const { data: nodes, isPending, isError } = useQuery({
    queryKey: ["nodes"],
    queryFn: fetchNodes,
  })

  const { mutate: createNodeMutate, isPending: isCreating } = useMutation({
    mutationFn: (data: CreateNode) => createNode(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nodes"] })
    },
  })

  const { mutate: updateNodeMutate, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateNode }) => updateNode(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nodes"] })
    },
  })

  const { mutate: deleteNodeMutate, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => deleteNode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nodes"] })
    },
  })

  return {
    nodes,
    isPending,
    isError,
    createNode: createNodeMutate,
    isCreating,
    updateNode: updateNodeMutate,
    isUpdating,
    deleteNode: deleteNodeMutate,
    isDeleting,
  }
}
