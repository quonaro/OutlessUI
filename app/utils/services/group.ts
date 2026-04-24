import { z } from 'zod'
import { GroupSchema, CreateGroupSchema, UpdateGroupSchema, type Group, type CreateGroup, type UpdateGroup } from '~/utils/schemas/group'
import { getAuthHeaders } from '~/utils/services/auth-header'

interface ListGroupsResponse {
  groups: unknown[]
}

export async function fetchGroups(baseURL: string): Promise<Group[]> {
  const data = await $fetch<ListGroupsResponse | unknown[]>(`${baseURL}/v1/groups`, {
    headers: getAuthHeaders(),
  })
  const groups = Array.isArray(data) ? data : data.groups
  return z.array(GroupSchema).parse(groups)
}

export async function createGroup(group: CreateGroup, baseURL: string): Promise<Group> {
  const payload = CreateGroupSchema.parse(group)
  const data = await $fetch(`${baseURL}/v1/groups`, {
    method: 'POST',
    body: payload,
    headers: getAuthHeaders(),
  })
  return GroupSchema.parse(data)
}

export async function updateGroup(id: string, group: UpdateGroup, baseURL: string): Promise<void> {
  const payload = UpdateGroupSchema.parse(group)
  await $fetch(`${baseURL}/v1/groups/${id}`, {
    method: 'PUT',
    body: payload,
    headers: getAuthHeaders(),
  })
}

export async function deleteGroup(id: string, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/v1/groups/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
}

export async function deleteUnavailableGroupNodes(id: string, baseURL: string): Promise<number> {
  const data = await $fetch<{ deleted?: number }>(`${baseURL}/v1/groups/${id}/nodes/delete-unavailable`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })
  return typeof data.deleted === 'number' ? data.deleted : 0
}

export async function probeUnavailableGroupNodes(id: string, baseURL: string): Promise<number> {
  const data = await $fetch<{ probed?: number }>(`${baseURL}/v1/groups/${id}/nodes/probe-unavailable`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })
  return typeof data.probed === 'number' ? data.probed : 0
}

export interface GroupSyncNodeEvent {
  group_id?: string
  node_id: string
  url: string
  status: 'importing' | 'done' | 'unavailable' | 'error'
  latency_ms: number
  processed?: number
  total?: number
  added_total?: number
  error?: string
}

export interface GroupSyncDoneEvent {
  synced_at: string
  deleted_unavailable_count?: number
  processed?: number
  total?: number
  added_count?: number
  group_id?: string
}

export interface GroupSyncStateEvent {
  group_id?: string
  running: boolean
  processed: number
  total: number
  nodes: GroupSyncNodeEvent[]
  error?: string
  synced_at?: string
  deleted_unavailable_count?: number
  added_count?: number
}

export interface GroupProbeUnavailableNodeEvent {
  group_id?: string
  node_id: string
  url: string
  status: 'queued' | 'probing' | 'ready' | 'error'
  latency_ms: number
  processed?: number
  total?: number
  active?: number
  completed?: number
  rate_per_sec?: number
  eta_sec?: number
  node_status?: 'healthy' | 'unhealthy' | 'unknown'
  country?: string
  error?: string
}

export interface GroupProbeUnavailableDoneEvent {
  group_id?: string
  probed: number
  processed?: number
  total?: number
  active?: number
  completed?: number
  rate_per_sec?: number
  eta_sec?: number
}

export interface GroupProbeUnavailableStateEvent {
  group_id?: string
  running: boolean
  processed: number
  total: number
  active?: number
  completed?: number
  rate_per_sec?: number
  eta_sec?: number
  nodes: GroupProbeUnavailableNodeEvent[]
  error?: string
  statuses?: string[]
  mode?: 'normal' | 'fast'
  probe_url?: string
}

export async function fetchGroupProbeUnavailableState(id: string, baseURL: string): Promise<GroupProbeUnavailableStateEvent> {
  const data = await $fetch<{ state: GroupProbeUnavailableStateEvent | undefined }>(
    `${baseURL}/v1/groups/${id}/probe-unavailable-state`,
    { headers: getAuthHeaders() },
  )
  const s = data.state
  if (!s) {
    return {
      running: false,
      total: 0,
      processed: 0,
      active: 0,
      completed: 0,
      rate_per_sec: 0,
      eta_sec: undefined,
      nodes: [],
      error: undefined,
      statuses: undefined,
      mode: undefined,
      probe_url: undefined,
    }
  }
  return {
    running: Boolean(s.running),
    total: typeof s.total === 'number' ? s.total : 0,
    processed: typeof s.processed === 'number' ? s.processed : 0,
    active: typeof s.active === 'number' ? s.active : 0,
    completed: typeof s.completed === 'number' ? s.completed : undefined,
    rate_per_sec: typeof s.rate_per_sec === 'number' ? s.rate_per_sec : 0,
    eta_sec: typeof s.eta_sec === 'number' ? s.eta_sec : undefined,
    nodes: Array.isArray(s.nodes) ? s.nodes : [],
    error: typeof s.error === 'string' ? s.error : undefined,
    statuses: Array.isArray(s.statuses) ? s.statuses : undefined,
    mode: s.mode,
    probe_url: typeof s.probe_url === 'string' ? s.probe_url : undefined,
  }
}
