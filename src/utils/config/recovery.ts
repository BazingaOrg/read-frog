import type { ConfigMeta } from "@/types/config/meta"
import { storage } from "#imports"
import {
  CONFIG_MIGRATION_RECOVERY_STORAGE_KEY,
  CONFIG_SCHEMA_VERSION,
  CONFIG_STORAGE_KEY,
} from "@/utils/constants/config"

export interface ConfigMigrationRecoveryRecord {
  rawConfig: unknown
  sourceMeta: ConfigMeta | null
  sourceVersion: number
  targetVersion: number
  createdAt: number
  error?: string
  invalidPaths: string[]
}

const recoveryStorageKey = `local:${CONFIG_MIGRATION_RECOVERY_STORAGE_KEY}` as const

export async function saveConfigMigrationRecovery(
  record: ConfigMigrationRecoveryRecord,
): Promise<void> {
  await storage.setItem(recoveryStorageKey, record)
}

export async function getConfigMigrationRecovery(): Promise<ConfigMigrationRecoveryRecord | null> {
  return (await storage.getItem<ConfigMigrationRecoveryRecord>(recoveryStorageKey)) ?? null
}

export async function clearConfigMigrationRecovery(): Promise<void> {
  await storage.removeItem(recoveryStorageKey)
}

export async function resetConfigFromRecovery(config: unknown): Promise<void> {
  await storage.setItem(`local:${CONFIG_STORAGE_KEY}`, config)
  await storage.setMeta(`local:${CONFIG_STORAGE_KEY}`, {
    schemaVersion: CONFIG_SCHEMA_VERSION,
    lastModifiedAt: Date.now(),
  })
  await clearConfigMigrationRecovery()
}
