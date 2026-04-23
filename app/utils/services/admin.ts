import { z } from 'zod'
import { AdminSchema, UpdateAdminPasswordSchema, ChangeAdminPasswordSchema, type Admin, type UpdateAdminPassword, type ChangeAdminPassword } from '~/utils/schemas/admin'
import { getAuthHeaders } from '~/utils/services/auth-header'

interface ListAdminsResponse {
  admins: unknown[]
}

export async function fetchAdmins(baseURL: string): Promise<Admin[]> {
  const data = await $fetch<ListAdminsResponse>(`${baseURL}/v1/admins`, {
    headers: getAuthHeaders(),
  })
  return z.array(AdminSchema).parse(data.admins)
}

export async function updateAdminPassword(id: string, password: UpdateAdminPassword, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/v1/admins/${id}`, {
    method: 'PUT',
    body: password,
    headers: getAuthHeaders(),
  })
}

export async function changeAdminPassword(data: ChangeAdminPassword, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/v1/admins/change-password`, {
    method: 'POST',
    body: data,
    headers: getAuthHeaders(),
  })
}

export async function deleteAdmin(id: string, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/v1/admins/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
}
