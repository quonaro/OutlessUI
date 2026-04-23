import { z } from "zod"
import type { Node, CreateNode } from "../schemas/node"
import { NodeSchema, CreateNodeSchema } from "../schemas/node"

const API_BASE = "/api/v1"

export async function fetchNodes(): Promise<Node[]> {
  const raw = await $fetch(`${API_BASE}/nodes`)
  const nodes = z.array(NodeSchema).parse(raw)
  return nodes
}

export async function createNode(data: CreateNode): Promise<Node> {
  const validated = CreateNodeSchema.parse(data)
  const raw = await $fetch(`${API_BASE}/nodes`, {
    method: "POST",
    body: validated,
  })
  return NodeSchema.parse(raw)
}

export async function updateNode(id: string, data: CreateNode): Promise<void> {
  const validated = CreateNodeSchema.parse(data)
  await $fetch(`${API_BASE}/nodes/${id}`, {
    method: "PUT",
    body: validated,
  })
}

export async function deleteNode(id: string): Promise<void> {
  await $fetch(`${API_BASE}/nodes/${id}`, {
    method: "DELETE",
  })
}
