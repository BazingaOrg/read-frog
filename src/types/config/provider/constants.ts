import {
  LLM_PROVIDER_MODELS,
  NON_API_TRANSLATE_PROVIDERS,
  NON_API_TRANSLATE_PROVIDERS_MAP,
  PURE_TRANSLATE_PROVIDERS,
} from "@/utils/constants/models"

export {
  LLM_PROVIDER_MODELS,
  NON_API_TRANSLATE_PROVIDERS,
  NON_API_TRANSLATE_PROVIDERS_MAP,
  PURE_TRANSLATE_PROVIDERS,
}

export const LLM_PROVIDER_TYPES = [
  "xai",
  "deepseek",
  "google",
  "moonshotai",
  "alibaba",
  "openai-compatible",
] as const
export type LLMProviderTypes = (typeof LLM_PROVIDER_TYPES)[number]
export function isLLMProvider(provider: string): provider is LLMProviderTypes {
  return LLM_PROVIDER_TYPES.includes(provider as LLMProviderTypes)
}

export const TRANSLATE_PROVIDER_TYPES = [
  ...NON_API_TRANSLATE_PROVIDERS,
  ...LLM_PROVIDER_TYPES,
] as const
export type TranslateProviderTypes = (typeof TRANSLATE_PROVIDER_TYPES)[number]
export function isTranslateProvider(provider: string): provider is TranslateProviderTypes {
  return TRANSLATE_PROVIDER_TYPES.includes(provider as TranslateProviderTypes)
}

export const OPENAI_COMPATIBLE_LLM_PROVIDER_TYPES = ["openai-compatible"] as const
export type OpenAICompatibleLLMProviderTypes = (typeof OPENAI_COMPATIBLE_LLM_PROVIDER_TYPES)[number]
export function isOpenAICompatibleLLMProvider(
  provider: string,
): provider is OpenAICompatibleLLMProviderTypes {
  return OPENAI_COMPATIBLE_LLM_PROVIDER_TYPES.includes(provider as OpenAICompatibleLLMProviderTypes)
}

export const OPEN_RESPONSES_LLM_PROVIDER_TYPES = [] as const
export type OpenResponsesLLMProviderTypes = never
export function isOpenResponsesLLMProvider(
  _provider: string,
): _provider is OpenResponsesLLMProviderTypes {
  return false
}

export const PROTOCOL_COMPATIBLE_LLM_PROVIDER_TYPES = OPENAI_COMPATIBLE_LLM_PROVIDER_TYPES
export type ProtocolCompatibleLLMProviderTypes = OpenAICompatibleLLMProviderTypes
export function isProtocolCompatibleLLMProvider(
  provider: string,
): provider is ProtocolCompatibleLLMProviderTypes {
  return isOpenAICompatibleLLMProvider(provider)
}

export const CUSTOM_MODEL_ONLY_PROVIDER_TYPES = OPENAI_COMPATIBLE_LLM_PROVIDER_TYPES
export type CustomModelOnlyProviderTypes = OpenAICompatibleLLMProviderTypes
export function isCustomModelOnlyProvider(
  provider: string,
): provider is CustomModelOnlyProviderTypes {
  return isOpenAICompatibleLLMProvider(provider)
}

export const DEDICATED_LLM_PROVIDER_TYPES = [
  "xai",
  "deepseek",
  "google",
  "moonshotai",
  "alibaba",
] as const
export type DedicatedLLMProviderTypes = (typeof DEDICATED_LLM_PROVIDER_TYPES)[number]
export function isDedicatedLLMProvider(provider: string): provider is DedicatedLLMProviderTypes {
  return DEDICATED_LLM_PROVIDER_TYPES.includes(provider as DedicatedLLMProviderTypes)
}

export const API_PROVIDER_TYPES = LLM_PROVIDER_TYPES
export type APIProviderTypes = LLMProviderTypes
export function isAPIProvider(provider: string): provider is APIProviderTypes {
  return isLLMProvider(provider)
}

export const PURE_API_PROVIDER_TYPES = [] as const
export type PureAPIProviderTypes = never
export function isPureAPIProvider(_provider: string): _provider is PureAPIProviderTypes {
  return false
}

export type NonAPIProviderTypes = (typeof NON_API_TRANSLATE_PROVIDERS)[number]
export function isNonAPIProvider(provider: string): provider is NonAPIProviderTypes {
  return NON_API_TRANSLATE_PROVIDERS.includes(provider as NonAPIProviderTypes)
}

export const ALL_PROVIDER_TYPES = TRANSLATE_PROVIDER_TYPES
export type AllProviderTypes = TranslateProviderTypes

export const AI_SDK_REASONING_VALUES = [
  "provider-default",
  "none",
  "minimal",
  "low",
  "medium",
  "high",
] as const
export type AISDKReasoning = (typeof AI_SDK_REASONING_VALUES)[number]

export const TOP_LEVEL_REASONING_PROVIDER_TYPES = ["xai", "deepseek", "google"] as const
export type TopLevelReasoningProviderTypes = (typeof TOP_LEVEL_REASONING_PROVIDER_TYPES)[number]
export function supportsTopLevelReasoning(
  provider: string,
): provider is TopLevelReasoningProviderTypes {
  return TOP_LEVEL_REASONING_PROVIDER_TYPES.includes(provider as TopLevelReasoningProviderTypes)
}

export function isPureTranslateProvider(
  provider: string,
): provider is (typeof PURE_TRANSLATE_PROVIDERS)[number] {
  return PURE_TRANSLATE_PROVIDERS.includes(provider as NonAPIProviderTypes)
}
