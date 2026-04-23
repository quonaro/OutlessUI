import { z } from 'zod'

export const NodeStatusSchema = z.enum(['unknown', 'healthy', 'unhealthy'])

export const NodeSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  group_id: z.string(),
  latency: z.number(), // milliseconds
  status: NodeStatusSchema,
  country: z.string(),
})

export const ProbeResultSchema = z.object({
  node_id: z.string(),
  latency: z.number(),
  status: NodeStatusSchema,
  country: z.string(),
  checked_at: z.string(),
})

export type Node = z.infer<typeof NodeSchema>
export type NodeStatus = z.infer<typeof NodeStatusSchema>
export type ProbeResult = z.infer<typeof ProbeResultSchema>
