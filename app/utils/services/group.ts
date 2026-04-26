import { z } from 'zod'
import { GroupSchema, CreateGroupSchema, UpdateGroupSchema, type Group, type CreateGroup, type UpdateGroup } from '~/utils/schemas/group'

interface ListGroupsResponse {
  groups: unknown[]
}

export async function fetchGroups(): Promise<Group[]> {
  const { $api } = useNuxtApp()
  const data = await $api<ListGroupsResponse | unknown[]>('/v1/groups')
  const groups = Array.isArray(data) ? data : data.groups
  return z.array(GroupSchema).parse(groups)
}

export async function createGroup(group: CreateGroup): Promise<Group> {
  const payload = CreateGroupSchema.parse(group)
  const { $api } = useNuxtApp()
  const data = await $api<Group>('/v1/groups', {
    method: 'POST',
    body: payload,
  })
  return GroupSchema.parse(data)
}

export async function updateGroup(id: string, group: UpdateGroup): Promise<void> {
  const payload = UpdateGroupSchema.parse(group)
  const { $api } = useNuxtApp()
  await $api(`/v1/groups/${id}`, {
    method: 'PUT',
    body: payload,
  })
}

export async function deleteGroup(id: string): Promise<void> {
  const { $api } = useNuxtApp()
  await $api(`/v1/groups/${id}`, {
    method: 'DELETE',
  })
}

export async function deleteUnavailableGroupNodes(id: string): Promise<number> {
  const { $api } = useNuxtApp()
  const data = await $api<{ deleted?: number }>(`/v1/groups/${id}/nodes/delete-unavailable`, {
    method: 'POST',
  })
  return typeof data.deleted === 'number' ? data.deleted : 0
}

export async function probeUnavailableGroupNodes(id: string): Promise<number> {
  const { $api } = useNuxtApp()
  const data = await $api<{ probed?: number }>(`/v1/groups/${id}/nodes/probe-unavailable`, {
    method: 'POST',
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

export async function fetchGroupProbeUnavailableState(id: string): Promise<GroupProbeUnavailableStateEvent> {
  const { $api } = useNuxtApp()
  const data = await $api<{ state: GroupProbeUnavailableStateEvent | undefined }>(
    `/v1/groups/${id}/probe-unavailable-state`,
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
