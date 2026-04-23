import { z } from 'zod'

export const LoginRequestSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
})

export const LoginResponseSchema = z.object({
  token: z.string(),
})

export const FirstAdminStatusResponseSchema = z.object({
  can_register: z.boolean(),
})

export const RegisterFirstAdminRequestSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
})

export const RegisterFirstAdminResponseSchema = z.object({
  token: z.string(),
})

export type LoginRequest = z.infer<typeof LoginRequestSchema>
export type LoginResponse = z.infer<typeof LoginResponseSchema>
export type FirstAdminStatusResponse = z.infer<typeof FirstAdminStatusResponseSchema>
export type RegisterFirstAdminRequest = z.infer<typeof RegisterFirstAdminRequestSchema>
export type RegisterFirstAdminResponse = z.infer<typeof RegisterFirstAdminResponseSchema>
