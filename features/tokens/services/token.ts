import { z } from "zod"
import type { Token, CreateToken } from "../schemas/token"
import { TokenSchema, CreateTokenSchema } from "../schemas/token"

const API_BASE = "/api/v1"

export async function fetchTokens(): Promise<Token[]> {
  const raw = await $fetch(`${API_BASE}/tokens`)
  const tokens = z.array(TokenSchema).parse(raw)
  return tokens
}

export async function createToken(data: CreateToken): Promise<Token> {
  const validated = CreateTokenSchema.parse(data)
  const raw = await $fetch(`${API_BASE}/tokens`, {
    method: "POST",
    body: validated,
  })
  return TokenSchema.parse(raw)
}

export async function deleteToken(id: string): Promise<void> {
  await $fetch(`${API_BASE}/tokens/${id}`, {
    method: "DELETE",
  })
}
