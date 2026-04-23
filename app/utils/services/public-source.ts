import { z } from 'zod'
import { PublicSourceSchema, CreatePublicSourceSchema, UpdatePublicSourceSchema, type PublicSource, type CreatePublicSource, type UpdatePublicSource } from '~/utils/schemas/public-source'
import { getAuthHeaders } from '~/utils/services/auth-header'

interface ListPublicSourcesResponse {
  public_sources: unknown[]
}

export async function fetchPublicSources(baseURL: string): Promise<PublicSource[]> {
  const data = await $fetch<ListPublicSourcesResponse | unknown[]>(`${baseURL}/v1/public-sources`, {
    headers: getAuthHeaders(),
  })
  const sources = Array.isArray(data) ? data : data.public_sources
  return z.array(PublicSourceSchema).parse(sources)
}

export async function createPublicSource(source: CreatePublicSource, baseURL: string): Promise<PublicSource> {
  const data = await $fetch(`${baseURL}/v1/public-sources`, {
    method: 'POST',
    body: source,
    headers: getAuthHeaders(),
  })
  return PublicSourceSchema.parse(data)
}

export async function updatePublicSource(id: string, source: UpdatePublicSource, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/v1/public-sources/${id}`, {
    method: 'PUT',
    body: source,
    headers: getAuthHeaders(),
  })
}

export async function deletePublicSource(id: string, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/v1/public-sources/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
}

export async function syncPublicSource(id: string, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/v1/public-sources/${id}/sync`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })
}
