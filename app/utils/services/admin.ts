import { z } from 'zod'
import { AdminSchema, CreateAdminSchema, UpdateAdminSchema, type Admin, type CreateAdmin, type UpdateAdmin } from '~/utils/schemas/admin'

export async function fetchAdmins(baseURL: string): Promise<Admin[]> {
  const data = await $fetch(`${baseURL}/v1/admins`)
  return z.array(AdminSchema).parse(data)
}

export async function fetchAdmin(id: string, baseURL: string): Promise<Admin> {
  const data = await $fetch(`${baseURL}/v1/admins/${id}`)
  return AdminSchema.parse(data)
}

export async function createAdmin(admin: CreateAdmin, baseURL: string): Promise<Admin> {
  const data = await $fetch(`${baseURL}/v1/admins`, {
    method: 'POST',
    body: admin,
  })
  return AdminSchema.parse(data)
}

export async function updateAdmin(id: string, admin: UpdateAdmin, baseURL: string): Promise<Admin> {
  const data = await $fetch(`${baseURL}/v1/admins/${id}`, {
    method: 'PUT',
    body: admin,
  })
  return AdminSchema.parse(data)
}

export async function deleteAdmin(id: string, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/v1/admins/${id}`, {
    method: 'DELETE',
  })
}
