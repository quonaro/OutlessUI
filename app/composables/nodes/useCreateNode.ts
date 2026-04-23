import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { createNode } from '~/utils/services/node'
import type { CreateNode } from '~/utils/schemas/node'

export function useCreateNode(
  options?: UseMutationOptions<void, Error, CreateNode>,
) {
  const config = useRuntimeConfig()
  const backendUrl = config.public.apiBase as string

  return useMutation({
    mutationFn: (payload: CreateNode) => createNode(payload, backendUrl),
    ...options,
  })
}
