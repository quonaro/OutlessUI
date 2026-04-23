import { z } from 'zod'
import { GroupSchema, CreateGroupSchema, UpdateGroupSchema, type Group, type CreateGroup, type UpdateGroup } from '~/utils/schemas/group'

export async function fetchGroups(baseURL: string): Promise<Group[]> {
  const data = await $fetch(`${baseURL}/groups`)
  return z.array(GroupSchema).parse(data)
}

export async function fetchGroup(id: string, baseURL: string): Promise<Group> {
  const data = await $fetch(`${baseURL}/groups/${id}`)
  return GroupSchema.parse(data)
}

export async function createGroup(group: CreateGroup, baseURL: string): Promise<Group> {
  const data = await $fetch(`${baseURL}/groups`, {
    method: 'POST',
    body: group,
  })
  return GroupSchema.parse(data)
}

export async function updateGroup(id: string, group: UpdateGroup, baseURL: string): Promise<Group> {
  const data = await $fetch(`${baseURL}/groups/${id}`, {
    method: 'PUT',
    body: group,
  })
  return GroupSchema.parse(data)
}

export async function deleteGroup(id: string, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/groups/${id}`, {
    method: 'DELETE',
  })
}
