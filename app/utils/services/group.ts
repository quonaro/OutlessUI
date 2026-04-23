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

export interface GroupSyncNodeEvent {
  node_id: string
  url: string
  status: 'importing' | 'done' | 'unavailable' | 'error'
  latency_ms: number
  error?: string
}

export interface GroupSyncDoneEvent {
  synced_at: string
}

export function syncGroupStream(
  groupId: string,
  baseURL: string,
  handlers: {
    onNodeStatus?: (event: GroupSyncNodeEvent) => void
    onDone?: (event: GroupSyncDoneEvent) => void
    onError?: (message: string) => void
  },
): EventSource {
  const token = useCookie<string | null>('auth_token').value
  const streamURL = new URL(`${baseURL}/v1/groups/${groupId}/sync/stream`, window.location.origin)
  if (token) {
    streamURL.searchParams.set('access_token', token)
  }

  const source = new EventSource(streamURL.toString())
  source.addEventListener('node_status', (event) => {
    try {
      const parsed = JSON.parse((event as MessageEvent).data) as GroupSyncNodeEvent
      handlers.onNodeStatus?.(parsed)
    } catch {
      handlers.onError?.('invalid node_status payload')
    }
  })
  source.addEventListener('done', (event) => {
    try {
      const parsed = JSON.parse((event as MessageEvent).data) as GroupSyncDoneEvent
      handlers.onDone?.(parsed)
    } catch {
      handlers.onError?.('invalid done payload')
    }
  })
  source.addEventListener('error', (event) => {
    try {
      const parsed = JSON.parse((event as MessageEvent).data) as { error?: string }
      handlers.onError?.(parsed.error ?? 'sync stream failed')
    } catch {
      handlers.onError?.('sync stream failed')
    }
  })

  return source
}
