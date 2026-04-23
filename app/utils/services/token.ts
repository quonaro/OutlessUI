import { z } from 'zod'
import { TokenSchema, CreateTokenSchema, type Token, type CreateToken } from '~/utils/schemas/token'

export async function fetchTokens(baseURL: string): Promise<Token[]> {
  const data = await $fetch(`${baseURL}/v1/tokens`)
  return z.array(TokenSchema).parse(data)
}

export async function fetchToken(id: string, baseURL: string): Promise<Token> {
  const data = await $fetch(`${baseURL}/v1/tokens/${id}`)
  return TokenSchema.parse(data)
}

export async function createToken(token: CreateToken, baseURL: string): Promise<Token> {
  const data = await $fetch(`${baseURL}/v1/tokens`, {
    method: 'POST',
    body: token,
  })
  return TokenSchema.parse(data)
}

export async function deleteToken(id: string, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/v1/tokens/${id}`, {
    method: 'DELETE',
  })
}
