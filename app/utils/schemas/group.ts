import { z } from 'zod'

export const GroupSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  source_url: z.string().optional().default(''),
  total_nodes: z.number().int().nonnegative().optional().default(0),
  healthy_nodes: z.number().int().nonnegative().optional().default(0),
  unhealthy_nodes: z.number().int().nonnegative().optional().default(0),
  unknown_nodes: z.number().int().nonnegative().optional().default(0),
  auto_delete_unavailable: z.boolean().optional().default(false),
  last_synced_at: z.string().nullable().optional().default(null),
  created_at: z.string(),
})

export const CreateGroupSchema = z.object({
  name: z.string().min(1),
  source_url: z.string().optional().default(''),
  auto_delete_unavailable: z.boolean().optional(),
})

export const UpdateGroupSchema = CreateGroupSchema

export type Group = z.infer<typeof GroupSchema>
export type CreateGroup = z.infer<typeof CreateGroupSchema>
export type UpdateGroup = z.infer<typeof UpdateGroupSchema>
