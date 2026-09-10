import { afterEach, describe, expect, it, vi } from "vitest"

describe("DEFAULT_CONFIG", () => {
  const originalCrypto = globalThis.crypto

  afterEach(() => {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: originalCrypto,
    })
    vi.resetModules()
  })

  it("initializes when crypto.randomUUID is unavailable but crypto.getRandomValues exists", async () => {
    const getRandomValues = vi.fn<(...args: any[]) => any>((array: Uint8Array<ArrayBuffer>) =>
      originalCrypto.getRandomValues(array),
    )

    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {
        getRandomValues,
      },
    })
    vi.resetModules()

    const { DEFAULT_CONFIG } = await import("../config")
    const { configSchema } = await import("@/types/config/config")

    expect(configSchema.safeParse(DEFAULT_CONFIG).success).toBe(true)
  })

  it("seeds the local-first provider whitelist and three-role assignments", async () => {
    const { DEFAULT_CONFIG } = await import("../config")
    const { configSchema } = await import("@/types/config/config")

    const parseResult = configSchema.safeParse(DEFAULT_CONFIG)
    if (!parseResult.success) {
      console.error(parseResult.error.issues)
    }

    expect(parseResult.success).toBe(true)
    expect(DEFAULT_CONFIG.providersConfig.map((provider) => provider.id)).toEqual([
      "google-translate-default",
      "microsoft-translate-default",
      "xai-default",
      "deepseek-default",
      "google-default",
      "moonshotai-default",
      "alibaba-default",
      "openai-compatible-default",
    ])
    expect(DEFAULT_CONFIG.providerAssignments).toEqual({
      translationProviderId: "microsoft-translate-default",
      subtitleProviderId: "microsoft-translate-default",
    })
  })

  it("defaults fresh hover translation off", async () => {
    const { DEFAULT_CONFIG } = await import("../config")

    expect(DEFAULT_CONFIG.pageTranslation.node.forceRetranslation).toBe(false)
  })

  it("keeps pre-v090 config parseable until the background migration runs", async () => {
    const { DEFAULT_CONFIG } = await import("../config")
    const { configSchema } = await import("@/types/config/config")
    const legacyConfig = structuredClone(DEFAULT_CONFIG)
    const legacyNode = legacyConfig.pageTranslation.node as Partial<
      typeof legacyConfig.pageTranslation.node
    >

    delete legacyNode.forceRetranslation
    legacyConfig.language.targetCode = "jpn"

    const result = configSchema.safeParse(legacyConfig)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.pageTranslation.node.forceRetranslation).toBe(false)
    expect(result.data.language.targetCode).toBe("jpn")
  })

  it("rebuilds an independent schema-valid default config", async () => {
    const { buildFreshDefaultConfig, DEFAULT_CONFIG } = await import("../config")
    const { configSchema } = await import("@/types/config/config")

    const config = buildFreshDefaultConfig()

    expect(config).not.toBe(DEFAULT_CONFIG)
    expect(config.providersConfig).not.toBe(DEFAULT_CONFIG.providersConfig)
    expect(configSchema.safeParse(config).success).toBe(true)
  })
})
