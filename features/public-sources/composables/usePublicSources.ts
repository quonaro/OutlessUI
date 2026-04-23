import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query"
import { fetchPublicSources, createPublicSource, updatePublicSource, deletePublicSource, syncPublicSource } from "../services/public-source"
import type { CreatePublicSource } from "../schemas/public-source"

export function usePublicSources() {
  const queryClient = useQueryClient()

  const { data: sources, isPending, isError } = useQuery({
    queryKey: ["public-sources"],
    queryFn: fetchPublicSources,
  })

  const { mutate: createSourceMutate, isPending: isCreating } = useMutation({
    mutationFn: (data: CreatePublicSource) => createPublicSource(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-sources"] })
    },
  })

  const { mutate: updateSourceMutate, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreatePublicSource }) => updatePublicSource(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-sources"] })
    },
  })

  const { mutate: deleteSourceMutate, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => deletePublicSource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-sources"] })
    },
  })

  const { mutate: syncSourceMutate, isPending: isSyncing } = useMutation({
    mutationFn: (id: string) => syncPublicSource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-sources"] })
    },
  })

  return {
    sources,
    isPending,
    isError,
    createSource: createSourceMutate,
    isCreating,
    updateSource: updateSourceMutate,
    isUpdating,
    deleteSource: deleteSourceMutate,
    isDeleting,
    syncSource: syncSourceMutate,
    isSyncing,
  }
}
