import { z } from 'zod'

export const AdminSchema = z.object({
  id: z.string(),
  username: z.string(),
})

export const UpdateAdminPasswordSchema = z.object({
  password: z.string().min(8).max(128),
})

export const ChangeAdminPasswordSchema = z.object({
  current_login: z.string(),
  current_password: z.string(),
  new_login: z.string().optional(),
  new_password: z.string().min(8).max(128),
  confirm_password: z.string().min(8).max(128),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
})

export type Admin = z.infer<typeof AdminSchema>
export type UpdateAdminPassword = z.infer<typeof UpdateAdminPasswordSchema>
export type ChangeAdminPassword = z.infer<typeof ChangeAdminPasswordSchema>
