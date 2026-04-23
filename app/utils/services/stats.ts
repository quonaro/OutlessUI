import { StatsSchema, type Stats } from '~/utils/schemas/stats'
import { getAuthHeaders } from '~/utils/services/auth-header'

export async function fetchStats(baseURL: string): Promise<Stats> {
  const data = await $fetch(`${baseURL}/v1/stats`, {
    headers: getAuthHeaders(),
  })
  return StatsSchema.parse(data)
}
