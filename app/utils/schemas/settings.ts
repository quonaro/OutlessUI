import { z } from 'zod'

export const XrayConfigSchema = z.object({
  admin_url: z.string(),
  probe_url: z.string(),
})

export const AdminConfigSchema = z.object({
  login: z.string(),
  password: z.string(),
})

export const JWTConfigSchema = z.object({
  secret: z.string(),
  expiry: z.string(),
})

export const CheckerConfigSchema = z.object({
  workers: z.number(),
  latency_filter: z.string(),
  public_refresh_interval: z.string(),
  check_interval: z.string(),
  xray: XrayConfigSchema,
})

export const DatabaseConfigSchema = z.object({
  url: z.string(),
})

export const APIConfigSchema = z.object({
  shutdown_timeout: z.string(),
  jwt: JWTConfigSchema,
  admin: AdminConfigSchema,
})

export const SettingsSchema = z.object({
  database: DatabaseConfigSchema,
  api: APIConfigSchema,
  checker: CheckerConfigSchema,
})

export type Settings = z.infer<typeof SettingsSchema>
export type UpdateSettings = z.infer<typeof SettingsSchema>
