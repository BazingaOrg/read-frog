import type {
  APIProviderConfig,
  LLMProviderConfig,
  NonAPIProviderConfig,
  ProviderConfig,
  ProvidersConfig,
  PureAPIProviderConfig,
  TranslateProviderConfig,
} from "@/types/config/provider"
import {
  isAPIProviderConfig,
  isLLMProviderConfig,
  isNonAPIProviderConfig,
  isPureAPIProviderConfig,
  isTranslateProviderConfig,
} from "@/types/config/provider"

export function getProviderConfigById<T extends ProviderConfig>(
  providersConfig: T[],
  providerId: string,
): T | undefined {
  return providersConfig.find((provider) => provider.id === providerId)
}

export function getLLMProvidersConfig(providersConfig: ProvidersConfig): LLMProviderConfig[] {
  return providersConfig.filter(isLLMProviderConfig)
}

export function getAPIProvidersConfig(providersConfig: ProvidersConfig): APIProviderConfig[] {
  return providersConfig.filter(isAPIProviderConfig)
}

export function getPureAPIProvidersConfig(
  providersConfig: ProvidersConfig,
): PureAPIProviderConfig[] {
  return providersConfig.filter(isPureAPIProviderConfig)
}

export function getNonAPIProvidersConfig(providersConfig: ProvidersConfig): NonAPIProviderConfig[] {
  return providersConfig.filter(isNonAPIProviderConfig)
}

export function getTranslateProvidersConfig(
  providersConfig: ProvidersConfig,
): TranslateProviderConfig[] {
  return providersConfig.filter(isTranslateProviderConfig)
}

export function filterEnabledProvidersConfig(providersConfig: ProvidersConfig): ProvidersConfig {
  return providersConfig.filter((provider) => provider.enabled)
}

export function getEnabledLLMProvidersConfig(
  providersConfig: ProvidersConfig,
): LLMProviderConfig[] {
  return providersConfig.filter(
    (provider): provider is LLMProviderConfig => provider.enabled && isLLMProviderConfig(provider),
  )
}

export function getProviderKeyByName(
  providersConfig: ProvidersConfig,
  name: string,
): string | undefined {
  return providersConfig.find((provider) => provider.name === name)?.id
}

export function getProviderModelConfig(providersConfig: ProvidersConfig, providerId: string) {
  const provider = getProviderConfigById(providersConfig, providerId)
  return provider && isLLMProviderConfig(provider) ? provider.model : undefined
}

export function getProviderApiKey(
  providersConfig: ProvidersConfig,
  providerId: string,
): string | undefined {
  const provider = getProviderConfigById(providersConfig, providerId)
  return provider && isAPIProviderConfig(provider) ? provider.apiKey : undefined
}
