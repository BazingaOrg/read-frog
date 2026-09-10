import type { Config } from "@/types/config/config"
import type { TranslateProviderConfig } from "@/types/config/provider"
import { isLLMProviderConfig } from "@/types/config/provider"
import { resolveProviderRefForCapability } from "./provider-registry"

export type UnwrappedProviderRef = TranslateProviderConfig

export type SerializableProviderRef = {
  kind: "local"
  config: TranslateProviderConfig
}

export function resolvePageTranslationProvider(config: Config): UnwrappedProviderRef {
  const provider = resolveProviderRefForCapability(
    "translation",
    config.providersConfig,
    config.providerAssignments.translationProviderId,
  )
  if (!provider) {
    throw new Error(
      `No page translation provider for id "${config.providerAssignments.translationProviderId}"`,
    )
  }
  return provider.config
}

export function resolvePageTranslationProviderOrNull(config: Config): UnwrappedProviderRef | null {
  try {
    return resolvePageTranslationProvider(config)
  } catch {
    return null
  }
}

export function getProviderCacheIdentity(ref: SerializableProviderRef): string {
  return JSON.stringify(ref.config)
}

export function canProviderRefGenerateText(ref: SerializableProviderRef): boolean {
  return isLLMProviderConfig(ref.config)
}

export async function serializeProviderRef(
  provider: UnwrappedProviderRef,
): Promise<SerializableProviderRef> {
  return { kind: "local", config: provider }
}

export type ProviderAvailability =
  | { available: true; providerRef: SerializableProviderRef }
  | { available: false; message: string }

export async function checkProviderAvailability(
  provider: UnwrappedProviderRef,
): Promise<ProviderAvailability> {
  return { available: true, providerRef: await serializeProviderRef(provider) }
}
