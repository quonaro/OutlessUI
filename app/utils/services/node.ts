import { z } from 'zod'
import { NodeSchema, type CreateNode, type Node, type UpdateNode } from '~/utils/schemas/node'
import { getAuthHeaders } from '~/utils/services/auth-header'

interface ListNodesResponse {
  nodes: unknown[]
  next_offset?: number
  has_more?: boolean
}

export interface NodesPage {
  nodes: Node[]
  nextOffset: number | null
  hasMore: boolean
}

export async function fetchNodes(baseURL: string): Promise<Node[]> {
  const data = await $fetch<ListNodesResponse | unknown[]>(`${baseURL}/v1/nodes?limit=50&offset=0`, {
    headers: getAuthHeaders(),
  })
  const nodes = Array.isArray(data) ? data : (data.nodes ?? [])
  return z.array(NodeSchema).parse(nodes)
}

export async function fetchNodesPage(baseURL: string, limit: number, offset: number): Promise<NodesPage> {
  const data = await $fetch<ListNodesResponse | unknown[]>(`${baseURL}/v1/nodes`, {
    query: { limit, offset },
    headers: getAuthHeaders(),
  })
  const nodesRaw = Array.isArray(data) ? data : (data.nodes ?? [])
  const nodes = z.array(NodeSchema).parse(nodesRaw)
  if (Array.isArray(data)) {
    return { nodes, nextOffset: null, hasMore: false }
  }
  return {
    nodes,
    nextOffset: typeof data.next_offset === 'number' ? data.next_offset : null,
    hasMore: Boolean(data.has_more),
  }
}

export async function createNode(node: CreateNode, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/v1/nodes`, {
    method: 'POST',
    body: node,
    headers: getAuthHeaders(),
  })
}

export async function updateNode(id: string, node: UpdateNode, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/v1/nodes/${id}`, {
    method: 'PUT',
    body: node,
    headers: getAuthHeaders(),
  })
}

export async function deleteNode(id: string, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/v1/nodes/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
}

export async function probeNode(id: string, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/v1/nodes/${id}/probe`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })
}
