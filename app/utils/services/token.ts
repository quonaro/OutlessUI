import { z } from 'zod'
import {
  IssuedTokenSchema,
  TokenSchema,
  type CreateToken,
  type IssuedToken,
  type Token,
  type UpdateToken,
} from '~/utils/schemas/token'
import { getAuthHeaders } from '~/utils/services/auth-header'

interface ListTokensResponse {
  tokens: unknown[]
}

export async function fetchTokens(baseURL: string): Promise<Token[]> {
  const data = await $fetch<ListTokensResponse | unknown[]>(`${baseURL}/v1/tokens`, {
    headers: getAuthHeaders(),
  })
  const tokens = Array.isArray(data) ? data : (data.tokens ?? [])
  return z.array(TokenSchema).parse(tokens)
}

export async function createToken(token: CreateToken, baseURL: string): Promise<IssuedToken> {
  const data = await $fetch(`${baseURL}/v1/tokens`, {
    method: 'POST',
    body: token,
    headers: getAuthHeaders(),
  })
  return IssuedTokenSchema.parse(data)
}

export async function deactivateToken(id: string, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/v1/tokens/${id}/deactivate`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })
}

export async function activateToken(id: string, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/v1/tokens/${id}/activate`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })
}

export async function removeToken(id: string, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/v1/tokens/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
}

export async function updateToken(id: string, token: UpdateToken, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/v1/tokens/${id}`, {
    method: 'PUT',
    body: token,
    headers: getAuthHeaders(),
  })
}
