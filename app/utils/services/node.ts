import { z } from 'zod'
import { NodeSchema, type Node } from '~/utils/schemas/node'

export async function fetchNodes(baseURL: string): Promise<Node[]> {
  const data = await $fetch(`${baseURL}/v1/nodes`)
  return z.array(NodeSchema).parse(data)
}

export async function fetchNode(id: string, baseURL: string): Promise<Node> {
  const data = await $fetch(`${baseURL}/v1/nodes/${id}`)
  return NodeSchema.parse(data)
}

export async function createNode(url: string, groupId: string, baseURL: string): Promise<Node> {
  const data = await $fetch(`${baseURL}/v1/nodes`, {
    method: 'POST',
    body: { url, group_id: groupId },
  })
  return NodeSchema.parse(data)
}

export async function updateNode(id: string, url: string, groupId: string, baseURL: string): Promise<Node> {
  const data = await $fetch(`${baseURL}/v1/nodes/${id}`, {
    method: 'PUT',
    body: { url, group_id: groupId },
  })
  return NodeSchema.parse(data)
}

export async function deleteNode(id: string, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/v1/nodes/${id}`, {
    method: 'DELETE',
  })
}
