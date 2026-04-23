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
  node_status?: 'healthy' | 'unhealthy' | 'unknown'
  country?: string
  error?: string
}

export interface GroupProbeUnavailableDoneEvent {
  group_id?: string
  probed: number
  processed?: number
  total?: number
}

export interface GroupProbeUnavailableStateEvent {
  group_id?: string
  running: boolean
  processed: number
  total: number
  nodes: GroupProbeUnavailableNodeEvent[]
}
