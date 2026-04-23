import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useInfiniteQuery } from '@tanstack/vue-query'
import { fetchNodesPage, type NodesPage } from '~/utils/services/node'

const PAGE_LIMIT = 50

export function useInfiniteNodes(enabled: MaybeRefOrGetter<boolean> = true) {
  const config = useRuntimeConfig()
  const backendUrl = config.public.apiBase as string

  const enabledRef = computed(() => toValue(enabled) !== false)

  return useInfiniteQuery<NodesPage, Error>({
    queryKey: ['nodes', 'infinite'],
    initialPageParam: 0,
    enabled: enabledRef,
    queryFn: ({ pageParam }) => fetchNodesPage(backendUrl, PAGE_LIMIT, Number(pageParam)),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.nextOffset != null ? lastPage.nextOffset : undefined,
  })
}
