import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { createNode } from '~/utils/services/node'
import type { Node } from '~/utils/schemas/node'

export function useCreateNode(
  options?: UseMutationOptions<Node, Error, { url: string; groupId: string }>
) {
  const config = useRuntimeConfig()
  const backendUrl = config.private.backendUrl as string

  return useMutation({
    mutationFn: ({ url, groupId }: { url: string; groupId: string }) =>
      createNode(url, groupId, backendUrl),
    ...options,
  })
}
