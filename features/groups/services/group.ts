import { z } from "zod"
import type { Group, CreateGroup } from "../schemas/group"
import { GroupSchema, CreateGroupSchema } from "../schemas/group"

const API_BASE = "/api/v1"

export async function fetchGroups(): Promise<Group[]> {
  const raw = await $fetch(`${API_BASE}/groups`)
  const groups = z.array(GroupSchema).parse(raw)
  return groups
}

export async function createGroup(data: CreateGroup): Promise<Group> {
  const validated = CreateGroupSchema.parse(data)
  const raw = await $fetch(`${API_BASE}/groups`, {
    method: "POST",
    body: validated,
  })
  return GroupSchema.parse(raw)
}

export async function updateGroup(id: string, data: CreateGroup): Promise<void> {
  const validated = CreateGroupSchema.parse(data)
  await $fetch(`${API_BASE}/groups/${id}`, {
    method: "PUT",
    body: validated,
  })
}

export async function deleteGroup(id: string): Promise<void> {
  await $fetch(`${API_BASE}/groups/${id}`, {
    method: "DELETE",
  })
}
