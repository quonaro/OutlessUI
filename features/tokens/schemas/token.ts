import { z } from "zod"

export const TokenSchema = z.object({
  id: z.string(),
  token: z.string().optional(),
  owner: z.string(),
  group_id: z.string(),
  is_active: z.boolean(),
  expires_at: z.string().datetime(),
  created_at: z.string().datetime(),
})

export const CreateTokenSchema = z.object({
  owner: z.string().min(1),
  group_id: z.string().min(1),
  expires_in: z.string().min(1).default("30d"),
})

export type Token = z.infer<typeof TokenSchema>
export type CreateToken = z.infer<typeof CreateTokenSchema>
