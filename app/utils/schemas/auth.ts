import { z } from 'zod'

export const LoginCredentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

export const AuthResponseSchema = z.object({
  token: z.string(),
})

export const FirstAdminStatusSchema = z.object({
  can_register: z.boolean(),
})

export type LoginCredentials = z.infer<typeof LoginCredentialsSchema>
export type AuthResponse = z.infer<typeof AuthResponseSchema>
export type FirstAdminStatus = z.infer<typeof FirstAdminStatusSchema>
