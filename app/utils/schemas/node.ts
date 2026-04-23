import { z } from 'zod'

export const NodeStatusSchema = z.enum(['unknown', 'healthy', 'unhealthy'])

export const NodeSchema = z.object({
  id: z.string(),
  url: z.string(),
  group_id: z.string(),
  latency_ms: z.number(),
  status: NodeStatusSchema,
  country: z.string(),
})

export const CreateNodeSchema = z.object({
  url: z.string().min(1),
  group_id: z.string().min(1),
})

export const UpdateNodeSchema = CreateNodeSchema

export const ProbeResultSchema = z.object({
  node_id: z.string(),
  latency: z.number(),
  status: NodeStatusSchema,
  country: z.string(),
  checked_at: z.string(),
})

export type Node = z.infer<typeof NodeSchema>
export type NodeStatus = z.infer<typeof NodeStatusSchema>
export type CreateNode = z.infer<typeof CreateNodeSchema>
export type UpdateNode = z.infer<typeof UpdateNodeSchema>
export type ProbeResult = z.infer<typeof ProbeResultSchema>
