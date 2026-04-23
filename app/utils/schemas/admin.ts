import { z } from 'zod'

export const AdminSchema = z.object({
  id: z.string(),
  username: z.string().min(1),
  created_at: z.string(),
})

export const CreateAdminSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(8),
})

export const UpdateAdminSchema = z.object({
  username: z.string().min(1).optional(),
  password: z.string().min(8).optional(),
})

export type Admin = z.infer<typeof AdminSchema>
export type CreateAdmin = z.infer<typeof CreateAdminSchema>
export type UpdateAdmin = z.infer<typeof UpdateAdminSchema>
