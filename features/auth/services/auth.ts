import { useNuxtApp } from '#app'
import type {
  FirstAdminStatusResponse,
  LoginRequest,
  LoginResponse,
  RegisterFirstAdminRequest,
  RegisterFirstAdminResponse,
} from '../schemas/auth'
import {
  FirstAdminStatusResponseSchema,
  LoginResponseSchema,
  RegisterFirstAdminResponseSchema,
} from '../schemas/auth'

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const { $api } = useNuxtApp()
  const response = await $api<LoginResponse>('/auth/login', {
    method: 'POST',
    body: data,
  })

  return LoginResponseSchema.parse(response)
}

export async function getFirstAdminStatus(): Promise<FirstAdminStatusResponse> {
  const { $api } = useNuxtApp()
  const response = await $api<FirstAdminStatusResponse>('/auth/register_first_admin')

  return FirstAdminStatusResponseSchema.parse(response)
}

export async function registerFirstAdmin(data: RegisterFirstAdminRequest): Promise<RegisterFirstAdminResponse> {
  const { $api } = useNuxtApp()
  const response = await $api<RegisterFirstAdminResponse>('/auth/register_first_admin', {
    method: 'POST',
    body: data,
  })

  return RegisterFirstAdminResponseSchema.parse(response)
}
