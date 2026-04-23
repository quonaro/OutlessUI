import { z } from 'zod'
import { NodeSchema, type CreateNode, type Node, type UpdateNode } from '~/utils/schemas/node'
import { getAuthHeaders } from '~/utils/services/auth-header'

interface ListNodesResponse {
  nodes: unknown[]
}

export async function fetchNodes(baseURL: string): Promise<Node[]> {
  const data = await $fetch<ListNodesResponse>(`${baseURL}/v1/nodes`, {
    headers: getAuthHeaders(),
  })
  return z.array(NodeSchema).parse(data.nodes ?? [])
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
