import { z } from 'zod'

export const GroupSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  created_at: z.string(),
})

export const CreateGroupSchema = z.object({
  name: z.string().min(1),
})

export const UpdateGroupSchema = z.object({
  name: z.string().min(1),
})

export type Group = z.infer<typeof GroupSchema>
export type CreateGroup = z.infer<typeof CreateGroupSchema>
export type UpdateGroup = z.infer<typeof UpdateGroupSchema>
