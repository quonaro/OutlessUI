import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { updateNode } from '~/utils/services/node'
import type { Node } from '~/utils/schemas/node'

export function useUpdateNode(
  options?: UseMutationOptions<Node, Error, { id: string; url: string; groupId: string }>
) {
  const config = useRuntimeConfig()
  const backendUrl = config.private.backendUrl as string

  return useMutation({
    mutationFn: ({ id, url, groupId }: { id: string; url: string; groupId: string }) =>
      updateNode(id, url, groupId, backendUrl),
    ...options,
  })
}
