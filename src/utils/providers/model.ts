import type { Config } from "@/types/config/config"
import type { DedicatedLLMProviderTypes, LLMProviderConfig } from "@/types/config/provider"
import { createAlibaba } from "@ai-sdk/alibaba"
import { createDeepSeek } from "@ai-sdk/deepseek"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createMoonshotAI } from "@ai-sdk/moonshotai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { createXai } from "@ai-sdk/xai"
import { storage } from "#imports"
import {
  isDedicatedLLMProviderConfig,
  isOpenAICompatibleLLMProviderConfig,
} from "@/types/config/provider"
import { getLLMProvidersConfig, getProviderConfigById } from "../config/helpers"
import { CONFIG_STORAGE_KEY } from "../constants/config"
import { getProviderHeadersWithOverride } from "./headers"
import { resolveModelId } from "./model-id"

const providerFactories = {
  xai: createXai,
  deepseek: createDeepSeek,
  google: createGoogleGenerativeAI,
  moonshotai: createMoonshotAI,
  alibaba: createAlibaba,
} as const satisfies Record<DedicatedLLMProviderTypes, unknown>

async function getLanguageModelById(providerId: string) {
  const config = await storage.getItem<Config>(`local:${CONFIG_STORAGE_KEY}`)
  if (!config) throw new Error("Config not found")
  const providerConfig = getProviderConfigById(
    getLLMProvidersConfig(config.providersConfig),
    providerId,
  )
  if (!providerConfig) throw new Error(`Provider ${providerId} not found`)
  return getLanguageModelForConfig(providerConfig)
}

export function getLanguageModelForConfig(providerConfig: LLMProviderConfig) {
  const headers = getProviderHeadersWithOverride(providerConfig.provider, providerConfig.headers)
  const options = {
    ...(providerConfig.baseURL && { baseURL: providerConfig.baseURL }),
    ...(providerConfig.apiKey && { apiKey: providerConfig.apiKey }),
    ...(headers && { headers }),
  }
  const provider = isOpenAICompatibleLLMProviderConfig(providerConfig)
    ? createOpenAICompatible({
        name: providerConfig.provider,
        baseURL: providerConfig.baseURL,
        supportsStructuredOutputs: true,
        ...(providerConfig.apiKey && { apiKey: providerConfig.apiKey }),
        ...(headers && { headers }),
      })
    : isDedicatedLLMProviderConfig(providerConfig)
      ? providerFactories[providerConfig.provider](options)
      : undefined
  if (!provider) throw new Error(`Unsupported provider ${providerConfig.provider}`)
  const modelId = resolveModelId(providerConfig.model)
  if (!modelId) throw new Error("Model is undefined")
  return provider.languageModel(modelId)
}

export async function getModelById(providerId: string) {
  return getLanguageModelById(providerId)
}
