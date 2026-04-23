import { z } from "zod"

export const AdminSchema = z.object({
  id: z.string(),
  username: z.string(),
})

export const UpdateAdminSchema = z.object({
  password: z.string().min(8),
})

export type Admin = z.infer<typeof AdminSchema>
export type UpdateAdmin = z.infer<typeof UpdateAdminSchema>
