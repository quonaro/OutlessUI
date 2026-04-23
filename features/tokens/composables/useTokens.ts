import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query"
import { fetchTokens, createToken, deleteToken } from "../services/token"
import type { CreateToken } from "../schemas/token"

export function useTokens() {
  const queryClient = useQueryClient()

  const { data: tokens, isPending, isError } = useQuery({
    queryKey: ["tokens"],
    queryFn: fetchTokens,
  })

  const { mutate: createTokenMutate, isPending: isCreating } = useMutation({
    mutationFn: (data: CreateToken) => createToken(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tokens"] })
    },
  })

  const { mutate: deleteTokenMutate, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => deleteToken(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tokens"] })
    },
  })

  return {
    tokens,
    isPending,
    isError,
    createToken: createTokenMutate,
    isCreating,
    deleteToken: deleteTokenMutate,
    isDeleting,
  }
}
