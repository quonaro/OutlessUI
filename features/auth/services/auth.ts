import { useNuxtApp } from '#app'
import type { LoginRequest, LoginResponse } from '../schemas/auth'
import { LoginResponseSchema } from '../schemas/auth'

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const { $api } = useNuxtApp()
  const response = await $api<LoginResponse>('/auth/login', {
    method: 'POST',
    body: data,
  })

  return LoginResponseSchema.parse(response)
}
