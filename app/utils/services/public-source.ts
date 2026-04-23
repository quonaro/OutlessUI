import { z } from 'zod'
import { PublicSourceSchema, CreatePublicSourceSchema, UpdatePublicSourceSchema, type PublicSource, type CreatePublicSource, type UpdatePublicSource } from '~/utils/schemas/public-source'

interface ListPublicSourcesResponse {
  public_sources: unknown[]
}

export async function fetchPublicSources(baseURL: string): Promise<PublicSource[]> {
  const data = await $fetch<ListPublicSourcesResponse>(`${baseURL}/v1/public-sources`)
  return z.array(PublicSourceSchema).parse(data.public_sources)
}

export async function createPublicSource(source: CreatePublicSource, baseURL: string): Promise<PublicSource> {
  const data = await $fetch(`${baseURL}/v1/public-sources`, {
    method: 'POST',
    body: source,
  })
  return PublicSourceSchema.parse(data)
}

export async function updatePublicSource(id: string, source: UpdatePublicSource, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/v1/public-sources/${id}`, {
    method: 'PUT',
    body: source,
  })
}

export async function deletePublicSource(id: string, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/v1/public-sources/${id}`, {
    method: 'DELETE',
  })
}

export async function syncPublicSource(id: string, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/v1/public-sources/${id}/sync`, {
    method: 'POST',
  })
}
