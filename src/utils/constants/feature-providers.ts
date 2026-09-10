import type { Config } from "@/types/config/config"
import type { ProviderConfig } from "@/types/config/provider"
import { isLLMProvider, isTranslateProvider } from "@/types/config/provider"
import { mergeWithArrayOverwrite } from "../atoms/config"
import { getProviderConfigById } from "../config/helpers"

export const FEATURE_KEYS = ["translation", "subtitles", "vocabulary"] as const
export type FeatureKey = (typeof FEATURE_KEYS)[number]

export interface FeatureProviderDef {
  getProviderId: (config: Config) => string | undefined
  configPath: readonly string[]
  isProvider: (provider: string) => boolean
}

export const FEATURE_PROVIDER_DEFS = {
  translation: {
    isProvider: isTranslateProvider,
    getProviderId: (config: Config) => config.providerAssignments.translationProviderId,
    configPath: ["providerAssignments", "translationProviderId"],
  },
  subtitles: {
    isProvider: isTranslateProvider,
    getProviderId: (config: Config) => config.providerAssignments.subtitleProviderId,
    configPath: ["providerAssignments", "subtitleProviderId"],
  },
  vocabulary: {
    isProvider: isLLMProvider,
    getProviderId: (config: Config) => config.providerAssignments.vocabularyProviderId,
    configPath: ["providerAssignments", "vocabularyProviderId"],
  },
} as const satisfies Record<FeatureKey, FeatureProviderDef>

export const FEATURE_KEY_I18N_MAP = {
  translation: "pageTranslation",
  subtitles: "videoSubtitles",
  vocabulary: "vocabulary",
} as const satisfies Record<FeatureKey, string>

export type FeatureLabelI18nKey =
  `options.apiProviders.featureProviders.features.${(typeof FEATURE_KEY_I18N_MAP)[FeatureKey]}`

export function getFeatureLabelI18nKey(featureKey: FeatureKey): FeatureLabelI18nKey {
  return `options.apiProviders.featureProviders.features.${FEATURE_KEY_I18N_MAP[featureKey]}`
}

export type FeatureDescriptionI18nKey =
  `options.apiProviders.featureProviders.descriptions.${(typeof FEATURE_KEY_I18N_MAP)[FeatureKey]}`

export function getFeatureDescriptionI18nKey(featureKey: FeatureKey): FeatureDescriptionI18nKey {
  return `options.apiProviders.featureProviders.descriptions.${FEATURE_KEY_I18N_MAP[featureKey]}`
}

export function resolveProviderConfig(config: Config, featureKey: FeatureKey): ProviderConfig {
  const providerConfig = resolveProviderConfigOrNull(config, featureKey)
  if (!providerConfig) {
    throw new Error(
      `No provider config for id "${FEATURE_PROVIDER_DEFS[featureKey].getProviderId(config)}" (feature "${featureKey}")`,
    )
  }
  return providerConfig
}

export function resolveProviderConfigOrNull(
  config: Config,
  featureKey: FeatureKey,
): ProviderConfig | null {
  const providerId = FEATURE_PROVIDER_DEFS[featureKey].getProviderId(config)
  return providerId ? (getProviderConfigById(config.providersConfig, providerId) ?? null) : null
}

export function buildFeatureProviderPatch(
  assignments: Partial<Record<FeatureKey, string>>,
): Partial<Config> {
  let patch: Partial<Config> = {}
  for (const featureKey of FEATURE_KEYS) {
    const providerId = assignments[featureKey]
    if (providerId === undefined) continue
    const path = FEATURE_PROVIDER_DEFS[featureKey].configPath
    const fragment: Record<string, unknown> = {}
    let cursor = fragment
    for (let index = 0; index < path.length - 1; index += 1) {
      const next: Record<string, unknown> = {}
      cursor[path[index]!] = next
      cursor = next
    }
    cursor[path.at(-1)!] = providerId
    patch = mergeWithArrayOverwrite(patch, fragment)
  }
  return patch
}
