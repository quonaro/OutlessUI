import { useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { createPublicSource } from '~/utils/services/public-source'
import type { PublicSource } from '~/utils/schemas/public-source'

export function useCreatePublicSource(
  options?: UseMutationOptions<PublicSource, Error, { url: string; groupId: string }>
) {
  const config = useRuntimeConfig()
  const backendUrl = config.public.apiBase as string

  return useMutation({
    mutationFn: ({ url, groupId }: { url: string; groupId: string }) =>
      createPublicSource(url, groupId, backendUrl),
    ...options,
  })
}
