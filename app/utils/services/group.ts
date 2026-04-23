import { z } from 'zod'
import { GroupSchema, CreateGroupSchema, UpdateGroupSchema, type Group, type CreateGroup, type UpdateGroup } from '~/utils/schemas/group'

interface ListGroupsResponse {
  groups: unknown[]
}

export async function fetchGroups(baseURL: string): Promise<Group[]> {
  const data = await $fetch<ListGroupsResponse>(`${baseURL}/v1/groups`)
  return z.array(GroupSchema).parse(data.groups)
}

export async function createGroup(group: CreateGroup, baseURL: string): Promise<Group> {
  const data = await $fetch(`${baseURL}/v1/groups`, {
    method: 'POST',
    body: group,
  })
  return GroupSchema.parse(data)
}

export async function updateGroup(id: string, group: UpdateGroup, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/v1/groups/${id}`, {
    method: 'PUT',
    body: group,
  })
}

export async function deleteGroup(id: string, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/v1/groups/${id}`, {
    method: 'DELETE',
  })
}
