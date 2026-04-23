import { type ChangeAdminPassword } from '~/utils/schemas/admin'
import { getAuthHeaders } from '~/utils/services/auth-header'

export async function changeAdminPassword(data: ChangeAdminPassword, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/v1/admins/change-password`, {
    method: 'POST',
    body: data,
    headers: getAuthHeaders(),
  })
}
