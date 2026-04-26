import { z } from 'zod'
import { LoginCredentialsSchema, AuthResponseSchema, FirstAdminStatusSchema } from '~/utils/schemas/auth'

export type LoginCredentials = z.infer<typeof LoginCredentialsSchema>
export type AuthResponse = z.infer<typeof AuthResponseSchema>
export type FirstAdminStatus = z.infer<typeof FirstAdminStatusSchema>

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const config = useRuntimeConfig()
  const data = await $fetch(`${config.public.apiBase}/v1/auth/login`, {
    method: 'POST',
    body: credentials,
  })
  return AuthResponseSchema.parse(data)
}

export async function registerFirstAdmin(credentials: LoginCredentials): Promise<AuthResponse> {
  const config = useRuntimeConfig()
  const data = await $fetch(`${config.public.apiBase}/v1/auth/register_first_admin`, {
    method: 'POST',
    body: credentials,
  })
  return AuthResponseSchema.parse(data)
}

export async function getFirstAdminStatus(): Promise<FirstAdminStatus> {
  const config = useRuntimeConfig()
  const data = await $fetch(`${config.public.apiBase}/v1/auth/register_first_admin`)
  return FirstAdminStatusSchema.parse(data)
}
