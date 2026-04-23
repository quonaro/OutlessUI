import { z } from "zod"
import type { PublicSource, CreatePublicSource } from "../schemas/public-source"
import { PublicSourceSchema, CreatePublicSourceSchema } from "../schemas/public-source"

const API_BASE = "/api/v1"

export async function fetchPublicSources(): Promise<PublicSource[]> {
  const raw = await $fetch(`${API_BASE}/public-sources`)
  const sources = z.array(PublicSourceSchema).parse(raw)
  return sources
}

export async function createPublicSource(data: CreatePublicSource): Promise<PublicSource> {
  const validated = CreatePublicSourceSchema.parse(data)
  const raw = await $fetch(`${API_BASE}/public-sources`, {
    method: "POST",
    body: validated,
  })
  return PublicSourceSchema.parse(raw)
}

export async function updatePublicSource(id: string, data: CreatePublicSource): Promise<void> {
  const validated = CreatePublicSourceSchema.parse(data)
  await $fetch(`${API_BASE}/public-sources/${id}`, {
    method: "PUT",
    body: validated,
  })
}

export async function deletePublicSource(id: string): Promise<void> {
  await $fetch(`${API_BASE}/public-sources/${id}`, {
    method: "DELETE",
  })
}

export async function syncPublicSource(id: string): Promise<void> {
  await $fetch(`${API_BASE}/public-sources/${id}/sync`, {
    method: "POST",
  })
}
