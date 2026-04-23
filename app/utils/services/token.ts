import { z } from 'zod'
import {
  IssuedTokenSchema,
  TokenSchema,
  type CreateToken,
  type IssuedToken,
  type Token,
} from '~/utils/schemas/token'
import { getAuthHeaders } from '~/utils/services/auth-header'

interface ListTokensResponse {
  tokens: unknown[]
}

export async function fetchTokens(baseURL: string): Promise<Token[]> {
  const data = await $fetch<ListTokensResponse>(`${baseURL}/v1/tokens`, {
    headers: getAuthHeaders(),
  })
  return z.array(TokenSchema).parse(data.tokens ?? [])
}

export async function createToken(token: CreateToken, baseURL: string): Promise<IssuedToken> {
  const data = await $fetch(`${baseURL}/v1/tokens`, {
    method: 'POST',
    body: token,
    headers: getAuthHeaders(),
  })
  return IssuedTokenSchema.parse(data)
}

export async function deleteToken(id: string, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/v1/tokens/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
}
