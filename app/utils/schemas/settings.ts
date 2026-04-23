import { z } from 'zod'

export const XrayConfigSchema = z.object({
  admin_url: z.string(),
  probe_url: z.string(),
  socks_addr: z.string(),
  geoip_db_path: z.string(),
  geoip_db_url: z.string(),
  geoip_auto: z.boolean(),
  geoip_ttl: z.string(),
})

export const CheckerConfigSchema = z.object({
  workers: z.number(),
  latency_filter: z.string(),
  public_refresh_interval: z.string(),
  check_interval: z.string(),
  xray: XrayConfigSchema,
})

export const HubConfigSchema = z.object({
  Host: z.string(),
  Port: z.number(),
  SNI: z.string(),
  PublicKey: z.string(),
  PrivateKey: z.string().optional(),
  ShortID: z.string(),
  Fingerprint: z.string(),
  ListenAddress: z.string(),
  ConfigPath: z.string(),
  XrayBinary: z.string(),
  SyncInterval: z.union([z.string(), z.number()]),
})

export const DatabaseConfigSchema = z.object({
  url: z.string(),
})

export const APIConfigSchema = z.object({
  shutdown_timeout: z.string(),
  jwt_expiry: z.string(),
  admin_login: z.string(),
  hub: HubConfigSchema.optional(),
})

export const SettingsSchema = z.object({
  database: DatabaseConfigSchema,
  api: APIConfigSchema,
  checker: CheckerConfigSchema,
})

export type Settings = z.infer<typeof SettingsSchema>
export type UpdateSettings = z.infer<typeof SettingsSchema>
