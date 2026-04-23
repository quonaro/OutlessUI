import { z } from 'zod'
import { NodeSchema, type CreateNode, type Node, type UpdateNode } from '~/utils/schemas/node'
import { getAuthHeaders } from '~/utils/services/auth-header'

interface ListNodesResponse {
  nodes: unknown[]
}

export async function fetchNodes(baseURL: string): Promise<Node[]> {
  const data = await $fetch<ListNodesResponse | unknown[]>(`${baseURL}/v1/nodes`, {
    headers: getAuthHeaders(),
  })
  const nodes = Array.isArray(data) ? data : (data.nodes ?? [])
  return z.array(NodeSchema).parse(nodes)
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
