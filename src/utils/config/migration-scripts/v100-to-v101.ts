function isObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

const retainedProviders = new Set([
  "google-translate",
  "microsoft-translate",
  "xai",
  "deepseek",
  "google",
  "moonshotai",
  "alibaba",
  "openai-compatible",
])

const retainedLlmProviders = new Set([
  "xai",
  "deepseek",
  "google",
  "moonshotai",
  "alibaba",
  "openai-compatible",
])

const microsoftProvider = {
  id: "microsoft-translate-default",
  enabled: true,
  name: "Microsoft Translator",
  provider: "microsoft-translate",
}

const allowedLlmModels: Record<string, string[]> = {
  xai: ["grok-4.20-0309-non-reasoning"],
  deepseek: ["deepseek-v4-flash", "deepseek-chat"],
  google: ["gemini-2.5-flash-lite", "gemini-2.5-flash"],
  moonshotai: ["kimi-k2-turbo"],
  alibaba: ["qwen3.5-flash"],
  "openai-compatible": ["use-custom-model"],
}

function normalizeRetainedProvider(provider: any): any {
  if (!isObject(provider) || !retainedLlmProviders.has(provider.provider)) return provider
  const allowed = allowedLlmModels[provider.provider]
  if (!allowed || !isObject(provider.model)) return provider

  const currentModel = provider.model.model
  if (provider.provider === "openai-compatible") {
    return {
      ...provider,
      model: {
        model: "use-custom-model",
        isCustomModel: true,
        customModel:
          typeof provider.model.customModel === "string" && provider.model.customModel.trim()
            ? provider.model.customModel
            : typeof currentModel === "string" && currentModel !== "use-custom-model"
              ? currentModel
              : "glm-4-flash",
      },
    }
  }

  if (typeof currentModel === "string" && allowed.includes(currentModel)) {
    return provider
  }

  return {
    ...provider,
    model: {
      model: allowed[0],
      isCustomModel: true,
      customModel:
        typeof currentModel === "string" && currentModel.length > 0 ? currentModel : allowed[0],
    },
  }
}

export function migrate(oldConfig: any): any {
  if (!isObject(oldConfig)) return oldConfig

  const oldProviders = Array.isArray(oldConfig.providersConfig) ? oldConfig.providersConfig : []
  const providersConfig = oldProviders
    .filter((provider: any) => isObject(provider) && retainedProviders.has(provider.provider))
    .map(normalizeRetainedProvider)
  if (!providersConfig.some((provider: any) => provider.id === microsoftProvider.id)) {
    providersConfig.push(microsoftProvider)
  }

  const usableProviderId = (providerId: any) => {
    const provider = providersConfig.find((item: any) => item.id === providerId)
    return provider?.enabled === true ? provider.id : microsoftProvider.id
  }

  const existingAssignments = isObject(oldConfig.providerAssignments)
    ? oldConfig.providerAssignments
    : null
  const dictionaryProviderId = oldConfig.selectionToolbar?.builtInActions?.dictionary?.providerId
  const configuredLlm = providersConfig.find(
    (provider: any) =>
      provider.enabled === true &&
      retainedLlmProviders.has(provider.provider) &&
      typeof provider.apiKey === "string" &&
      provider.apiKey.trim().length > 0,
  )
  const requestedVocabularyProvider = providersConfig.find(
    (provider: any) =>
      provider.id === dictionaryProviderId &&
      provider.enabled === true &&
      retainedLlmProviders.has(provider.provider) &&
      typeof provider.apiKey === "string" &&
      provider.apiKey.trim().length > 0,
  )
  const vocabularyProviderId =
    existingAssignments?.vocabularyProviderId ?? (requestedVocabularyProvider || configuredLlm)?.id

  const pageTranslation = isObject(oldConfig.pageTranslation)
    ? { ...oldConfig.pageTranslation }
    : oldConfig.pageTranslation
  if (isObject(pageTranslation)) delete pageTranslation.providerId

  const videoSubtitles = isObject(oldConfig.videoSubtitles)
    ? { ...oldConfig.videoSubtitles }
    : oldConfig.videoSubtitles
  if (isObject(videoSubtitles)) delete videoSubtitles.providerId

  const selectionToolbar = isObject(oldConfig.selectionToolbar)
    ? {
        enabled: oldConfig.selectionToolbar.enabled,
        disabledSelectionToolbarPatterns:
          oldConfig.selectionToolbar.disabledSelectionToolbarPatterns,
        opacity: oldConfig.selectionToolbar.opacity,
        features: {
          translate: {
            enabled: oldConfig.selectionToolbar.features?.translate?.enabled,
            shortcut: oldConfig.selectionToolbar.features?.translate?.shortcut,
          },
          speak: {
            enabled: oldConfig.selectionToolbar.features?.speak?.enabled,
          },
        },
      }
    : oldConfig.selectionToolbar

  const result = { ...oldConfig }
  delete result.languageDetection
  delete result.inputTranslation
  delete result.analytics
  delete result.googleDrive
  delete result.hostedAi
  delete result.hostedPlan
  result.providersConfig = providersConfig
  result.providerAssignments = {
    translationProviderId:
      existingAssignments?.translationProviderId ??
      usableProviderId(oldConfig.pageTranslation?.providerId),
    subtitleProviderId:
      existingAssignments?.subtitleProviderId ??
      usableProviderId(oldConfig.videoSubtitles?.providerId),
    ...(vocabularyProviderId ? { vocabularyProviderId } : {}),
  }
  result.pageTranslation = pageTranslation
  result.selectionToolbar = selectionToolbar
  result.videoSubtitles = videoSubtitles
  return result
}
