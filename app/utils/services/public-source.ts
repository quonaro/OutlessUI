import { z } from 'zod'
import type { PublicSource } from '~/utils/schemas/public-source'
import { PublicSourceSchema } from '~/utils/schemas/public-source'

export async function fetchPublicSources(baseURL: string): Promise<PublicSource[]> {
  const data = await $fetch(`${baseURL}/public-sources`)
  return z.array(PublicSourceSchema).parse(data)
}

export async function createPublicSource(url: string, groupId: string, baseURL: string): Promise<PublicSource> {
  const data = await $fetch(`${baseURL}/public-sources`, {
    method: 'POST',
    body: { url, group_id: groupId },
  })
  return PublicSourceSchema.parse(data)
}

export async function deletePublicSource(id: string, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/public-sources/${id}`, {
    method: 'DELETE',
  })
}
