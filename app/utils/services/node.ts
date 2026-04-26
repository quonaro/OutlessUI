import { z } from 'zod'
import { NodeSchema, type CreateNode, type Node, type UpdateNode } from '~/utils/schemas/node'

interface ListNodesResponse {
  nodes: unknown[]
  next_offset?: number
  has_more?: boolean
}

interface ProbeNodeAcceptedResponse {
  job_id?: string
  node_id?: string
  status?: string
  requested_by?: string
}

interface ProbeJobResponse {
  id?: string
  node_id?: string
  status?: string
}

function unwrapBody<T extends object>(data: T | { body?: T }): T {
  if (typeof data === 'object' && data !== null && 'body' in data) {
    return ((data as { body?: T }).body ?? {}) as T
  }
  return data as T
}

export interface NodesPage {
  nodes: Node[]
  nextOffset: number | null
  hasMore: boolean
}

function parseNextOffset(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw
  }
  if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) {
    return Number(raw)
  }
  return null
}

export async function fetchNodes(): Promise<Node[]> {
  const { $api } = useNuxtApp()
  const data = await $api<ListNodesResponse | unknown[]>('/v1/nodes?limit=50&offset=0')
  const nodes = Array.isArray(data) ? data : (data.nodes ?? [])
  return z.array(NodeSchema).parse(nodes)
}

export async function fetchNodesPage(
  limit: number,
  offset: number,
  groupId?: string,
): Promise<NodesPage> {
  const query: Record<string, string | number> = { limit, offset }
  if (groupId) {
    query.group_id = groupId
  }
  const { $api } = useNuxtApp()
  const data = await $api<ListNodesResponse | unknown[]>('/v1/nodes', { query })
  const nodesRaw = Array.isArray(data) ? data : (data.nodes ?? [])
  const nodes = z.array(NodeSchema).parse(nodesRaw)
  if (Array.isArray(data)) {
    return { nodes, nextOffset: null, hasMore: false }
  }
  const hasMore = Boolean(data.has_more)
  let nextOffset = parseNextOffset(data.next_offset)
  if (hasMore && nextOffset == null) {
    nextOffset = offset + nodes.length
  }
  return {
    nodes,
    nextOffset,
    hasMore,
  }
}

export async function createNode(node: CreateNode): Promise<void> {
  const { $api } = useNuxtApp()
  await $api('/v1/nodes', {
    method: 'POST',
    body: node,
  })
}

export async function fetchNodeByID(id: string): Promise<Node> {
  const { $api } = useNuxtApp()
  const data = await $api<{ node?: unknown } | unknown>(`/v1/nodes/${id}`)
  const raw = typeof data === 'object' && data !== null && 'node' in data ? (data as { node?: unknown }).node : data
  return NodeSchema.parse(raw)
}

export async function updateNode(id: string, node: UpdateNode): Promise<void> {
  const { $api } = useNuxtApp()
  await $api(`/v1/nodes/${id}`, {
    method: 'PATCH',
    body: node,
  })
}

export async function deleteNode(id: string): Promise<void> {
  const { $api } = useNuxtApp()
  await $api(`/v1/nodes/${id}`, {
    method: 'DELETE',
  })
}

export async function probeNode(id: string, mode: 'normal' | 'fast' = 'normal', probeURL = ''): Promise<{ jobID: string, nodeID: string, status: string }> {
  const { $api } = useNuxtApp()
  const data = await $api<{ body?: ProbeNodeAcceptedResponse } | ProbeNodeAcceptedResponse>(`/v1/nodes/${id}/probe`, {
    method: 'POST',
    body: { mode, probe_url: probeURL },
  })
  const payload = unwrapBody<ProbeNodeAcceptedResponse>(data)
  return {
    jobID: String(payload.job_id ?? ''),
    nodeID: String(payload.node_id ?? id),
    status: String(payload.status ?? 'pending'),
  }
}

export async function fetchProbeJobStatus(jobID: string): Promise<{ id: string, nodeID: string, status: string }> {
  const { $api } = useNuxtApp()
  const data = await $api<{ body?: ProbeJobResponse } | ProbeJobResponse>(`/v1/probe-jobs/${jobID}`)
  const payload = unwrapBody<ProbeJobResponse>(data)
  return {
    id: String(payload.id ?? jobID),
    nodeID: String(payload.node_id ?? ''),
    status: String(payload.status ?? 'pending'),
  }
}
