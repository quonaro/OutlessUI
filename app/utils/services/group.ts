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
  const data = await $fetch(`${baseURL}/v1/groups`, {
    method: 'POST',
    body: group,
    headers: getAuthHeaders(),
  })
  return GroupSchema.parse(data)
}

export async function updateGroup(id: string, group: UpdateGroup, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/v1/groups/${id}`, {
    method: 'PUT',
    body: group,
    headers: getAuthHeaders(),
  })
}

export async function deleteGroup(id: string, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/v1/groups/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
}
