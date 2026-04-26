import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { createPublicSource } from '~/utils/services/public-source'
import type { CreatePublicSource, PublicSource } from '~/utils/schemas/public-source'

export function useCreatePublicSource(
  options?: UseMutationOptions<PublicSource, Error, CreatePublicSource>,
) {
  return useMutation({
    mutationFn: (payload: CreatePublicSource) =>
      createPublicSource(payload),
    ...options,
  })
}
