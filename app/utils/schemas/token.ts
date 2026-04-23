import { z } from 'zod'

export const TokenSchema = z.object({
  id: z.string(),
  owner: z.string(),
  group_id: z.string(),
  is_active: z.boolean(),
  expires_at: z.string(),
  created_at: z.string(),
})

export const CreateTokenSchema = z.object({
  owner: z.string().min(1),
  group_id: z.string().min(1),
  expires_at: z.string().optional(),
})

export type Token = z.infer<typeof TokenSchema>
export type CreateToken = z.infer<typeof CreateTokenSchema>
