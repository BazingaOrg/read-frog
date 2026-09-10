import type { Config } from "@/types/config/config"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { isAPIProviderConfig } from "@/types/config/provider"
import { CONFIG_SCHEMA_VERSION, DEFAULT_CONFIG } from "@/utils/constants/config"
import { MICROSOFT_TRANSLATE_PROVIDER_ID } from "@/utils/constants/providers"

const getItemMock = vi.fn<(...args: any[]) => any>()
const getMetaMock = vi.fn<(...args: any[]) => any>()
const setItemMock = vi.fn<(...args: any[]) => any>()
const setMetaMock = vi.fn<(...args: any[]) => any>()
const removeItemMock = vi.fn<(...args: any[]) => any>()
const runMigrationMock = vi.fn<(...args: any[]) => any>()
const loggerWarnMock = vi.fn<(...args: any[]) => any>()

vi.mock("#imports", () => ({
  storage: {
    getItem: getItemMock,
    getMeta: getMetaMock,
    setItem: setItemMock,
    setMeta: setMetaMock,
    removeItem: removeItemMock,
  },
}))

vi.mock("wxt/utils/storage", () => ({
  storage: {
    getItem: getItemMock,
    getMeta: getMetaMock,
    setItem: setItemMock,
    setMeta: setMetaMock,
    removeItem: removeItemMock,
  },
}))

vi.mock("../migration", () => ({
  runMigration: runMigrationMock,
}))

vi.mock("@/utils/logger", () => ({
  logger: {
    warn: loggerWarnMock,
  },
}))

function buildStableConfig(): Config {
  const config = structuredClone(DEFAULT_CONFIG)
  // In DEV mode, beta experience is enabled. Keep it true so no extra write is introduced.
  config.betaExperience.enabled = true
  config.providersConfig = config.providersConfig.map((providerConfig) => {
    if (!isAPIProviderConfig(providerConfig)) {
      return providerConfig
    }

    const apiKeyEnvName = `WXT_${providerConfig.provider.toUpperCase()}_API_KEY`
    const envApiKey = import.meta.env[apiKeyEnvName] as string | undefined
    if (!envApiKey) {
      return providerConfig
    }

    return {
      ...providerConfig,
      apiKey: envApiKey,
    }
  })
  return config
}

describe("initializeConfig", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    setItemMock.mockResolvedValue(undefined)
    setMetaMock.mockResolvedValue(undefined)
    removeItemMock.mockResolvedValue(undefined)
    runMigrationMock.mockImplementation(async (_nextVersion: number, config: Config) => config)
  })

  function translateProviderIdsOf(config: Config) {
    return [
      config.providerAssignments.translationProviderId,
      config.providerAssignments.subtitleProviderId,
    ]
  }

  it("does not write when config and meta are already up to date", async () => {
    const config = buildStableConfig()
    getItemMock.mockResolvedValueOnce(config)
    getMetaMock.mockResolvedValueOnce({
      schemaVersion: CONFIG_SCHEMA_VERSION,
      lastModifiedAt: 123,
    })

    const { initializeConfig } = await import("../init")
    await initializeConfig()

    expect(runMigrationMock).not.toHaveBeenCalled()
    expect(setItemMock).not.toHaveBeenCalled()
    expect(setMetaMock).not.toHaveBeenCalled()
  })

  it("writes config and meta when config is missing", async () => {
    getItemMock.mockResolvedValueOnce(null)
    getMetaMock.mockResolvedValueOnce(null)

    const { initializeConfig } = await import("../init")
    await initializeConfig()

    expect(setItemMock).toHaveBeenCalledTimes(1)
    expect(setItemMock).toHaveBeenCalledWith("local:config", expect.any(Object))
    const freshConfig = setItemMock.mock.calls[0]?.[1] as Config
    expect(freshConfig.providersConfig.map((provider) => provider.id)).toEqual([
      "google-translate-default",
      "microsoft-translate-default",
      "xai-default",
      "deepseek-default",
      "google-default",
      "moonshotai-default",
      "alibaba-default",
      "openai-compatible-default",
    ])
    expect(setMetaMock).toHaveBeenCalledTimes(1)
    expect(setMetaMock).toHaveBeenCalledWith(
      "local:config",
      expect.objectContaining({
        schemaVersion: CONFIG_SCHEMA_VERSION,
        lastModifiedAt: expect.any(Number),
      }),
    )
  })

  it("starts every translate feature on the globally reachable Microsoft default", async () => {
    getItemMock.mockResolvedValueOnce(null)
    getMetaMock.mockResolvedValueOnce(null)

    const { initializeConfig } = await import("../init")
    const { isFreshInstall } = await initializeConfig()

    expect(isFreshInstall).toBe(true)
    const freshConfig = setItemMock.mock.calls[0]?.[1] as Config
    expect(translateProviderIdsOf(freshConfig)).toEqual([
      MICROSOFT_TRANSLATE_PROVIDER_ID,
      MICROSOFT_TRANSLATE_PROVIDER_ID,
    ])
  })

  it("does not report a fresh install when a stored config is reused", async () => {
    const config = buildStableConfig()
    getItemMock.mockResolvedValueOnce(config)
    getMetaMock.mockResolvedValueOnce({
      schemaVersion: CONFIG_SCHEMA_VERSION,
      lastModifiedAt: 123,
    })

    const { initializeConfig } = await import("../init")
    const { isFreshInstall } = await initializeConfig()

    expect(isFreshInstall).toBe(false)
  })

  it("preserves an unparseable config and records recovery details", async () => {
    getItemMock.mockResolvedValueOnce({ not: "a config" })
    getMetaMock.mockResolvedValueOnce({
      schemaVersion: CONFIG_SCHEMA_VERSION,
      lastModifiedAt: 123,
    })

    const { initializeConfig } = await import("../init")
    await expect(initializeConfig()).rejects.toMatchObject({
      name: "ConfigMigrationFailedError",
      invalidPaths: expect.any(Array),
    })
    expect(setItemMock).toHaveBeenCalledTimes(1)
    expect(setItemMock).toHaveBeenCalledWith(
      "local:configMigrationRecovery",
      expect.objectContaining({
        rawConfig: { not: "a config" },
        sourceVersion: CONFIG_SCHEMA_VERSION,
        targetVersion: CONFIG_SCHEMA_VERSION,
        invalidPaths: expect.any(Array),
      }),
    )
    expect(setItemMock).not.toHaveBeenCalledWith("local:config", expect.anything())
    expect(setMetaMock).not.toHaveBeenCalled()
  })

  it("runs migration and persists migrated config once", async () => {
    const config = buildStableConfig()
    const migrated = {
      ...config,
      contextMenu: {
        ...config.contextMenu,
        enabled: false,
      },
    }
    getItemMock.mockResolvedValueOnce(config)
    getMetaMock.mockResolvedValueOnce({
      schemaVersion: CONFIG_SCHEMA_VERSION - 1,
      lastModifiedAt: 888,
    })
    runMigrationMock.mockResolvedValueOnce(migrated)

    const { initializeConfig } = await import("../init")
    await initializeConfig()

    expect(runMigrationMock).toHaveBeenCalledWith(CONFIG_SCHEMA_VERSION, config)
    expect(setItemMock).toHaveBeenCalledWith(
      "local:configMigrationRecovery",
      expect.objectContaining({
        rawConfig: config,
        sourceVersion: CONFIG_SCHEMA_VERSION - 1,
        targetVersion: CONFIG_SCHEMA_VERSION,
      }),
    )
    expect(setItemMock).toHaveBeenCalledWith("local:config", migrated)
    expect(setMetaMock).toHaveBeenCalledTimes(1)
    expect(setMetaMock).toHaveBeenCalledWith("local:config", {
      schemaVersion: CONFIG_SCHEMA_VERSION,
      lastModifiedAt: 888,
    })
    expect(removeItemMock).toHaveBeenCalledWith("local:configMigrationRecovery")
  })

  it("does not advance config or meta when a migration throws", async () => {
    const config = buildStableConfig()
    getItemMock.mockResolvedValueOnce(config)
    getMetaMock.mockResolvedValueOnce({
      schemaVersion: CONFIG_SCHEMA_VERSION - 1,
      lastModifiedAt: 456,
    })
    runMigrationMock.mockRejectedValueOnce(new Error("migration exploded"))

    const { initializeConfig } = await import("../init")
    await expect(initializeConfig()).rejects.toThrow("migration exploded")

    expect(setItemMock).toHaveBeenCalledWith(
      "local:configMigrationRecovery",
      expect.objectContaining({
        rawConfig: config,
        sourceVersion: CONFIG_SCHEMA_VERSION - 1,
        targetVersion: CONFIG_SCHEMA_VERSION,
        error: "migration exploded",
      }),
    )
    expect(setItemMock).not.toHaveBeenCalledWith("local:config", expect.anything())
    expect(setMetaMock).not.toHaveBeenCalled()
    expect(removeItemMock).not.toHaveBeenCalled()
  })

  it("only updates meta when config is unchanged but lastModifiedAt is missing", async () => {
    const config = buildStableConfig()
    getItemMock.mockResolvedValueOnce(config)
    getMetaMock.mockResolvedValueOnce({
      schemaVersion: CONFIG_SCHEMA_VERSION,
    })

    const { initializeConfig } = await import("../init")
    await initializeConfig()

    expect(setItemMock).not.toHaveBeenCalled()
    expect(setMetaMock).toHaveBeenCalledTimes(1)
    expect(setMetaMock).toHaveBeenCalledWith(
      "local:config",
      expect.objectContaining({
        schemaVersion: CONFIG_SCHEMA_VERSION,
        lastModifiedAt: expect.any(Number),
      }),
    )
  })
})
