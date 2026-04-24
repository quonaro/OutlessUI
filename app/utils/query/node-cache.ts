import type { QueryClient } from '@tanstack/vue-query'
import type { Node } from '~/utils/schemas/node'

type NodePatch = {
  id: string
  status?: Node['status']
  latency_ms?: number
  country?: string
}

function isNodeArray(value: unknown): value is Node[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null && 'id' in item)
}

function applyPatch(node: Node, patch: NodePatch): Node {
  if (node.id !== patch.id) return node
  return {
    ...node,
    ...(patch.status != null ? { status: patch.status } : {}),
    ...(patch.latency_ms != null ? { latency_ms: patch.latency_ms } : {}),
    ...(patch.country != null ? { country: patch.country } : {}),
  }
}

export function patchNodeInCacheData(oldData: unknown, patch: NodePatch): unknown {
  if (isNodeArray(oldData)) {
    return oldData.map((node) => applyPatch(node, patch))
  }
  if (typeof oldData === 'object' && oldData !== null && 'pages' in oldData) {
    const inf = oldData as { pages?: Array<{ nodes?: Node[] }> }
    if (!Array.isArray(inf.pages)) return oldData
    return {
      ...inf,
      pages: inf.pages.map((page) => ({
        ...page,
        nodes: Array.isArray(page.nodes)
          ? page.nodes.map((node) => applyPatch(node, patch))
          : page.nodes,
      })),
    }
  }
  return oldData
}

export function patchNodeInAllNodeQueries(queryClient: QueryClient, patch: NodePatch) {
  queryClient.setQueriesData({ queryKey: ['nodes'] }, (oldData) => patchNodeInCacheData(oldData, patch))
}

