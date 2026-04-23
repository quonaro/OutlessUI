import { z } from "zod"

export const NodeSchema = z.object({
  id: z.string(),
  url: z.string(),
  group_id: z.string(),
  latency_ms: z.number(),
  status: z.enum(["unknown", "healthy", "unhealthy"]),
  country: z.string(),
})

export const CreateNodeSchema = z.object({
  url: z.string().url().min(1),
  group_id: z.string().min(1),
})

export type Node = z.infer<typeof NodeSchema>
export type CreateNode = z.infer<typeof CreateNodeSchema>
