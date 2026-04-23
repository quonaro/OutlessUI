import { z } from "zod"

export const PublicSourceSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  group_id: z.string(),
  last_fetched_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
})

export const CreatePublicSourceSchema = z.object({
  url: z.string().url().min(1),
  group_id: z.string().min(1),
})

export type PublicSource = z.infer<typeof PublicSourceSchema>
export type CreatePublicSource = z.infer<typeof CreatePublicSourceSchema>
