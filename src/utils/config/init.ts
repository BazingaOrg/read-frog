import type { Config } from "@/types/config/config"
import type { ConfigMeta } from "@/types/config/meta"
import { storage } from "#imports"
import { configSchema } from "@/types/config/config"
import { isAPIProviderConfig } from "@/types/config/provider"
import { initI18n } from "@/utils/i18n"
import {
  buildFreshDefaultConfig,
  CONFIG_SCHEMA_VERSION,
  CONFIG_STORAGE_KEY,
  DEFAULT_CONFIG,
} from "../constants/config"
import { ConfigMigrationFailedError, ConfigVersionTooNewError } from "./errors"
import { runMigration } from "./migration"
import {
  clearConfigMigrationRecovery,
  saveConfigMigrationRecovery,
  type ConfigMigrationRecoveryRecord,
} from "./recovery"

export interface InitializeConfigResult {
  /**
   * The config was created from defaults in this run — either no stored value existed, or the
   * stored value failed validation and was rebuilt. Callers use it to run one-time setup that
   * only makes sense on untouched defaults (see `selectFreshTranslateProviders`).
   */
  isFreshInstall: boolean
}

/**
 * Initialize the config, this function should only be called once in the background script
 * @returns The extension config
 */
export async function initializeConfig(): Promise<InitializeConfigResult> {
  const [storedConfig, configMeta] = await Promise.all([
    storage.getItem<unknown>(`local:${CONFIG_STORAGE_KEY}`),
    storage.getMeta<ConfigMeta>(`local:${CONFIG_STORAGE_KEY}`),
  ])

  let config: unknown
  let currentVersion: number
  let didConfigChange = false
  let isFreshInstall = false

  if (!storedConfig) {
    // Initialize locale before building defaults used by this browser context.
    await initI18n(DEFAULT_CONFIG.uiLanguage)
    config = buildFreshDefaultConfig()
    currentVersion = CONFIG_SCHEMA_VERSION
    didConfigChange = true
    isFreshInstall = true
  } else {
    config = storedConfig
    currentVersion = configMeta?.schemaVersion ?? 1
  }

  if (currentVersion > CONFIG_SCHEMA_VERSION) {
    throw new ConfigVersionTooNewError(
      `Stored config version ${currentVersion} is newer than supported version ${CONFIG_SCHEMA_VERSION}`,
    )
  }

  let recoveryRecord: ConfigMigrationRecoveryRecord | null = null
  if (storedConfig && currentVersion < CONFIG_SCHEMA_VERSION) {
    recoveryRecord = {
      rawConfig: structuredClone(storedConfig),
      sourceMeta: configMeta ?? null,
      sourceVersion: currentVersion,
      targetVersion: CONFIG_SCHEMA_VERSION,
      createdAt: Date.now(),
      invalidPaths: [],
    }
    await saveConfigMigrationRecovery(recoveryRecord)
  }

  try {
    while (currentVersion < CONFIG_SCHEMA_VERSION) {
      const nextVersion = currentVersion + 1
      config = await runMigration(nextVersion, config)
      didConfigChange = true
      currentVersion = nextVersion
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (recoveryRecord) {
      await saveConfigMigrationRecovery({ ...recoveryRecord, error: message })
    }
    throw new ConfigMigrationFailedError(message)
  }

  const parseResult = configSchema.safeParse(config)
  if (!parseResult.success) {
    const invalidPaths = parseResult.error.issues.map((issue) => issue.path.join("."))
    const message = parseResult.error.message
    const record = recoveryRecord ?? {
      rawConfig: structuredClone(config),
      sourceMeta: configMeta ?? null,
      sourceVersion: currentVersion,
      targetVersion: CONFIG_SCHEMA_VERSION,
      createdAt: Date.now(),
      invalidPaths: [],
    }
    await saveConfigMigrationRecovery({ ...record, error: message, invalidPaths })
    throw new ConfigMigrationFailedError(message, invalidPaths)
  }
  let validatedConfig = parseResult.data

  if (import.meta.env.DEV) {
    const apiKeyResult = applyAPIKeysFromEnv(validatedConfig)
    validatedConfig = apiKeyResult.config
    didConfigChange = didConfigChange || apiKeyResult.changed

    const betaResult = applyDevBetaExperience(validatedConfig)
    validatedConfig = betaResult.config
    didConfigChange = didConfigChange || betaResult.changed
  }

  const didMetaNeedUpdate =
    configMeta?.schemaVersion !== currentVersion || configMeta?.lastModifiedAt === undefined

  if (didConfigChange) {
    await storage.setItem<Config>(`local:${CONFIG_STORAGE_KEY}`, validatedConfig)
  }

  if (didConfigChange || didMetaNeedUpdate) {
    await storage.setMeta<ConfigMeta>(`local:${CONFIG_STORAGE_KEY}`, {
      schemaVersion: currentVersion,
      lastModifiedAt: configMeta?.lastModifiedAt ?? Date.now(),
    })
  }

  if (recoveryRecord) {
    await clearConfigMigrationRecovery()
  }

  return { isFreshInstall }
}

function applyAPIKeysFromEnv(config: Config): { config: Config; changed: boolean } {
  let changed = false

  const providersConfig = config.providersConfig.map((providerConfig) => {
    if (!isAPIProviderConfig(providerConfig)) {
      return providerConfig
    }

    const apiKeyEnvName = `WXT_${providerConfig.provider.toUpperCase()}_API_KEY`
    const envApiKey = import.meta.env[apiKeyEnvName] as string | undefined
    if (!envApiKey || providerConfig.apiKey === envApiKey) {
      return providerConfig
    }

    changed = true
    return {
      ...providerConfig,
      apiKey: envApiKey,
    }
  })

  if (!changed) {
    return { config, changed: false }
  }

  return {
    config: {
      ...config,
      providersConfig,
    },
    changed: true,
  }
}

function applyDevBetaExperience(config: Config): { config: Config; changed: boolean } {
  if (config.betaExperience.enabled) {
    return { config, changed: false }
  }

  return {
    config: {
      ...config,
      betaExperience: {
        ...config.betaExperience,
        enabled: true,
      },
    },
    changed: true,
  }
}
