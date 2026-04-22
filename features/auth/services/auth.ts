import type { LoginRequest, LoginResponse } from '../schemas/auth'
import { LoginResponseSchema } from '../schemas/auth'

const API_BASE = 'http://localhost:41220'

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await $fetch(`${API_BASE}/v1/auth/login`, {
    method: 'POST',
    body: data,
  })

  return LoginResponseSchema.parse(response)
}
