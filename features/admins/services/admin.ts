import { z } from "zod"
import type { Admin, UpdateAdmin } from "../schemas/admin"
import { AdminSchema, UpdateAdminSchema } from "../schemas/admin"

const API_BASE = "/api/v1"

export async function fetchAdmins(): Promise<Admin[]> {
  const raw = await $fetch(`${API_BASE}/admins`)
  const admins = z.array(AdminSchema).parse(raw)
  return admins
}

export async function updateAdmin(id: string, data: UpdateAdmin): Promise<void> {
  const validated = UpdateAdminSchema.parse(data)
  await $fetch(`${API_BASE}/admins/${id}`, {
    method: "PUT",
    body: validated,
  })
}

export async function deleteAdmin(id: string): Promise<void> {
  await $fetch(`${API_BASE}/admins/${id}`, {
    method: "DELETE",
  })
}
