import { z } from 'zod'

export const PublicSourceSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  group_id: z.string(),
  last_fetched_at: z.string().nullable(),
  created_at: z.string(),
})

export type PublicSource = z.infer<typeof PublicSourceSchema>
