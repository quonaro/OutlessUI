import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { updateNode } from '~/utils/services/node'
import type { UpdateNode } from '~/utils/schemas/node'

export interface UpdateNodePayload extends UpdateNode {
  id: string
}

export function useUpdateNode(
  options?: UseMutationOptions<void, Error, UpdateNodePayload>,
) {
  const config = useRuntimeConfig()
  const backendUrl = config.public.apiBase as string

  return useMutation({
    mutationFn: ({ id, ...rest }: UpdateNodePayload) =>
      updateNode(id, rest, backendUrl),
    ...options,
  })
}
