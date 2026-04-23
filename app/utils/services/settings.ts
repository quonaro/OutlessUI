import { z } from 'zod'
import { SettingsSchema, type Settings, type UpdateSettings } from '~/utils/schemas/settings'

export async function fetchSettings(baseURL: string): Promise<Settings> {
  if (import.meta.dev) {
    console.debug('[trace][settings] fetchSettings', {
      url: `${baseURL}/v1/settings`,
      server: import.meta.server,
      client: import.meta.client,
    })
    console.trace('[trace][settings] fetchSettings stack')
  }
  const data = await $fetch(`${baseURL}/v1/settings`)
  return SettingsSchema.parse(data)
}

export async function updateSettings(settings: UpdateSettings, baseURL: string): Promise<void> {
  await $fetch(`${baseURL}/v1/settings`, {
    method: 'PUT',
    body: settings,
  })
}
