import { z } from 'zod'
import type { PublicSource } from '~/utils/schemas/public-source'
import { PublicSourceSchema } from '~/utils/schemas/public-source'

export async function fetchPublicSources(baseURL: string): Promise<PublicSource[]> {
  const data = await $fetch(`${baseURL}/public-sources`)
  return z.array(PublicSourceSchema).parse(data)
}
