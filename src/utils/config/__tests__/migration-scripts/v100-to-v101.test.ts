import { describe, expect, it } from "vitest"
import { migrate } from "../../migration-scripts/v100-to-v101"

function oldConfig(overrides: Record<string, unknown> = {}): any {
  return {
    providersConfig: [
      {
        id: "microsoft-translate-default",
        enabled: true,
        name: "Microsoft Translator",
        provider: "microsoft-translate",
      },
      {
        id: "deepseek-custom",
        enabled: true,
        name: "DeepSeek",
        provider: "deepseek",
        apiKey: "key",
      },
      { id: "openai-default", enabled: true, name: "OpenAI", provider: "openai", apiKey: "key" },
    ],
    pageTranslation: { providerId: "openai-default", mode: "bilingual" },
    videoSubtitles: { providerId: "deepseek-custom", enabled: true },
    languageDetection: { mode: "llm", providerId: "openai-default" },
    inputTranslation: { enabled: true, providerId: "openai-default" },
    selectionToolbar: {
      enabled: true,
      disabledSelectionToolbarPatterns: [],
      opacity: 0.9,
      features: {
        translate: { enabled: true, providerId: "openai-default", shortcut: "Alt+T" },
        speak: { enabled: true },
      },
      builtInActions: { dictionary: { enabled: true, providerId: "deepseek-custom" } },
      customActions: [{ id: "old" }],
      noteSuggestion: { enabled: true, providerId: "openai-default" },
    },
    ...overrides,
  }
}

describe("v100 to v101 migration", () => {
  it("keeps retained providers, removes retired capabilities, and assigns three roles", () => {
    const migrated = migrate(oldConfig())

    expect(migrated.providersConfig.map((provider: any) => provider.provider)).toEqual([
      "microsoft-translate",
      "deepseek",
    ])
    expect(migrated.providerAssignments).toEqual({
      translationProviderId: "microsoft-translate-default",
      subtitleProviderId: "deepseek-custom",
      vocabularyProviderId: "deepseek-custom",
    })
    expect(migrated.pageTranslation).not.toHaveProperty("providerId")
    expect(migrated.videoSubtitles).not.toHaveProperty("providerId")
    expect(migrated.selectionToolbar.features.translate).not.toHaveProperty("providerId")
    expect(migrated.selectionToolbar).not.toHaveProperty("customActions")
    expect(migrated.selectionToolbar).not.toHaveProperty("noteSuggestion")
    expect(migrated).not.toHaveProperty("inputTranslation")
    expect(migrated).not.toHaveProperty("languageDetection")
  })

  it("does not invent a vocabulary provider when no retained LLM is configured", () => {
    const migrated = migrate(
      oldConfig({
        providersConfig: [
          { id: "google-free", enabled: true, name: "Google", provider: "google-translate" },
        ],
      }),
    )

    expect(migrated.providerAssignments.vocabularyProviderId).toBeUndefined()
    expect(migrated.providerAssignments.translationProviderId).toBe("microsoft-translate-default")
    expect(migrated.providersConfig).toContainEqual(microsoftProvider)
  })

  it("is idempotent", () => {
    const once = migrate(oldConfig())
    expect(migrate(once)).toEqual(once)
  })
})

const microsoftProvider = {
  id: "microsoft-translate-default",
  enabled: true,
  name: "Microsoft Translator",
  provider: "microsoft-translate",
}
