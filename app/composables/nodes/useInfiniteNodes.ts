import { useInfiniteQuery, type UseInfiniteQueryOptions } from '@tanstack/vue-query'
import { fetchNodesPage, type NodesPage } from '~/utils/services/node'

const PAGE_LIMIT = 50

export function useInfiniteNodes(options?: UseInfiniteQueryOptions<NodesPage, Error>) {
  const config = useRuntimeConfig()
  const backendUrl = config.public.apiBase as string

  return useInfiniteQuery({
    queryKey: ['nodes', 'infinite'],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchNodesPage(backendUrl, PAGE_LIMIT, Number(pageParam)),
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextOffset : undefined),
    ...options,
  })
}
