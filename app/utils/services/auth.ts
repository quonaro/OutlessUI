import { z } from 'zod'
import { LoginCredentialsSchema, AuthResponseSchema, FirstAdminStatusSchema } from '~/utils/schemas/auth'

export type LoginCredentials = z.infer<typeof LoginCredentialsSchema>
export type AuthResponse = z.infer<typeof AuthResponseSchema>
export type FirstAdminStatus = z.infer<typeof FirstAdminStatusSchema>

export async function login(credentials: LoginCredentials, baseURL: string): Promise<AuthResponse> {
  const data = await $fetch(`${baseURL}/v1/auth/login`, {
    method: 'POST',
    body: credentials,
  })
  return AuthResponseSchema.parse(data)
}

export async function registerFirstAdmin(credentials: LoginCredentials, baseURL: string): Promise<AuthResponse> {
  const data = await $fetch(`${baseURL}/v1/auth/register_first_admin`, {
    method: 'POST',
    body: credentials,
  })
  return AuthResponseSchema.parse(data)
}

export async function getFirstAdminStatus(baseURL: string): Promise<FirstAdminStatus> {
  const data = await $fetch(`${baseURL}/v1/auth/register_first_admin`)
  return FirstAdminStatusSchema.parse(data)
}
