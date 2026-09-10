import type {
  APIProviderTypes,
  LLMProviderModels,
  LLMProviderTypes,
  ProvidersConfig,
} from "@/types/config/provider"
import type { Theme } from "@/types/config/theme"
import customProviderLogo from "@/assets/providers/custom-provider.svg?url&no-inline"
import {
  API_PROVIDER_TYPES,
  LLM_PROVIDER_TYPES,
  NON_API_TRANSLATE_PROVIDERS,
  NON_API_TRANSLATE_PROVIDERS_MAP,
  PURE_TRANSLATE_PROVIDERS,
  TRANSLATE_PROVIDER_TYPES,
} from "@/types/config/provider"
import { getLobeIconsCDNUrlFn } from "../logo"

export const DEFAULT_LLM_PROVIDER_MODELS: LLMProviderModels = {
  xai: {
    model: "grok-4.20-0309-non-reasoning",
    isCustomModel: false,
    customModel: null,
  },
  deepseek: { model: "deepseek-v4-flash", isCustomModel: false, customModel: null },
  google: { model: "gemini-2.5-flash-lite", isCustomModel: false, customModel: null },
  moonshotai: { model: "kimi-k2-turbo", isCustomModel: false, customModel: null },
  alibaba: { model: "qwen3.5-flash", isCustomModel: false, customModel: null },
  "openai-compatible": {
    model: "use-custom-model",
    isCustomModel: true,
    customModel: "glm-4-flash",
  },
}

type ProviderItem = {
  logo: (theme: Theme) => string
  name: string
  website: string
  apiKeyUrl?: string
}

export const PROVIDER_ITEMS: Record<(typeof TRANSLATE_PROVIDER_TYPES)[number], ProviderItem> = {
  "google-translate": {
    logo: getLobeIconsCDNUrlFn("google-color"),
    name: NON_API_TRANSLATE_PROVIDERS_MAP["google-translate"],
    website: "https://translate.google.com",
  },
  "microsoft-translate": {
    logo: getLobeIconsCDNUrlFn("microsoft-color"),
    name: NON_API_TRANSLATE_PROVIDERS_MAP["microsoft-translate"],
    website: "https://translator.microsoft.com",
  },
  xai: {
    logo: getLobeIconsCDNUrlFn("xai"),
    name: "Grok",
    website: "https://x.ai",
    apiKeyUrl: "https://console.x.ai",
  },
  deepseek: {
    logo: getLobeIconsCDNUrlFn("deepseek-color"),
    name: "DeepSeek",
    website: "https://www.deepseek.com",
    apiKeyUrl: "https://platform.deepseek.com/api_keys",
  },
  google: {
    logo: getLobeIconsCDNUrlFn("gemini-color"),
    name: "Gemini",
    website: "https://ai.google.dev",
    apiKeyUrl: "https://aistudio.google.com/app/apikey",
  },
  moonshotai: {
    logo: getLobeIconsCDNUrlFn("moonshot"),
    name: "Kimi",
    website: "https://platform.moonshot.cn",
    apiKeyUrl: "https://platform.moonshot.cn/console/api-keys",
  },
  alibaba: {
    logo: getLobeIconsCDNUrlFn("qwen-color"),
    name: "Qwen",
    website: "https://www.alibabacloud.com/help/model-studio",
  },
  "openai-compatible": {
    logo: () => customProviderLogo,
    name: "GLM / OpenAI Compatible",
    website: "https://open.bigmodel.cn",
  },
}

export const DEFAULT_PROVIDER_CONFIG = {
  "google-translate": {
    id: "google-translate-default",
    enabled: true,
    name: PROVIDER_ITEMS["google-translate"].name,
    provider: "google-translate",
  },
  "microsoft-translate": {
    id: "microsoft-translate-default",
    enabled: true,
    name: PROVIDER_ITEMS["microsoft-translate"].name,
    provider: "microsoft-translate",
  },
  xai: {
    id: "xai-default",
    enabled: true,
    name: PROVIDER_ITEMS.xai.name,
    provider: "xai",
    reasoning: "none",
    model: DEFAULT_LLM_PROVIDER_MODELS.xai,
  },
  deepseek: {
    id: "deepseek-default",
    enabled: true,
    name: PROVIDER_ITEMS.deepseek.name,
    provider: "deepseek",
    reasoning: "none",
    model: DEFAULT_LLM_PROVIDER_MODELS.deepseek,
  },
  google: {
    id: "google-default",
    enabled: true,
    name: PROVIDER_ITEMS.google.name,
    provider: "google",
    reasoning: "none",
    model: DEFAULT_LLM_PROVIDER_MODELS.google,
  },
  moonshotai: {
    id: "moonshotai-default",
    enabled: true,
    name: PROVIDER_ITEMS.moonshotai.name,
    provider: "moonshotai",
    model: DEFAULT_LLM_PROVIDER_MODELS.moonshotai,
  },
  alibaba: {
    id: "alibaba-default",
    enabled: true,
    name: PROVIDER_ITEMS.alibaba.name,
    provider: "alibaba",
    model: DEFAULT_LLM_PROVIDER_MODELS.alibaba,
  },
  "openai-compatible": {
    id: "openai-compatible-default",
    enabled: true,
    name: PROVIDER_ITEMS["openai-compatible"].name,
    provider: "openai-compatible",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    model: DEFAULT_LLM_PROVIDER_MODELS["openai-compatible"],
  },
} as const

export const GOOGLE_TRANSLATE_PROVIDER_ID = DEFAULT_PROVIDER_CONFIG["google-translate"].id
export const MICROSOFT_TRANSLATE_PROVIDER_ID = DEFAULT_PROVIDER_CONFIG["microsoft-translate"].id

export const FORCED_PROVIDER_HEADERS: Partial<Record<LLMProviderTypes, Record<string, string>>> = {}

export const PROVIDER_URL_PLACEHOLDERS: Partial<Record<APIProviderTypes, string>> = {
  "openai-compatible": "https://open.bigmodel.cn/api/paas/v4",
}

export const DEFAULT_PROVIDER_CONFIG_LIST: ProvidersConfig = Object.values(DEFAULT_PROVIDER_CONFIG)

export function getDefaultProviderDescription(_providerType: APIProviderTypes): string | undefined {
  return undefined
}

export function buildDefaultProviderConfigList(): ProvidersConfig {
  return structuredClone(DEFAULT_PROVIDER_CONFIG_LIST)
}

function pickItems<const T extends readonly (keyof typeof PROVIDER_ITEMS)[]>(types: T) {
  return Object.fromEntries(types.map((type) => [type, PROVIDER_ITEMS[type]])) as Pick<
    typeof PROVIDER_ITEMS,
    T[number]
  >
}

export const NON_API_TRANSLATE_PROVIDER_ITEMS = pickItems(NON_API_TRANSLATE_PROVIDERS)
export const TRANSLATE_PROVIDER_ITEMS = pickItems(TRANSLATE_PROVIDER_TYPES)
export const PURE_TRANSLATE_PROVIDER_ITEMS = pickItems(PURE_TRANSLATE_PROVIDERS)
export const LLM_PROVIDER_ITEMS = pickItems(LLM_PROVIDER_TYPES)
export const API_PROVIDER_ITEMS = pickItems(API_PROVIDER_TYPES)

export function getProviderItemName(providerType: APIProviderTypes): string {
  return PROVIDER_ITEMS[providerType].name
}

export const PROVIDER_GROUPS = {
  popularProviders: {
    types: ["xai", "deepseek", "google", "moonshotai", "alibaba"] as const,
    tutorialSlug: "llm",
  },
  compatibleProviders: {
    types: ["openai-compatible"] as const,
    tutorialSlug: "openai-compatible",
  },
}

export const SPECIFIC_TUTORIAL_PROVIDER_TYPES = [] as const satisfies readonly APIProviderTypes[]
