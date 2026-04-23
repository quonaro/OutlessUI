import { z } from "zod"
import type { Settings } from "../schemas/settings"
import { SettingsSchema } from "../schemas/settings"

const API_BASE = "/api/v1"

export async function fetchSettings(): Promise<Settings> {
  const raw = await $fetch(`${API_BASE}/settings`)
  return SettingsSchema.parse(raw)
}

export async function updateSettings(data: Settings): Promise<void> {
  const validated = SettingsSchema.parse(data)
  await $fetch(`${API_BASE}/settings`, {
    method: "PUT",
    body: validated,
  })
}
