import type { JSONValue } from "ai"

export const LLM_PROVIDER_MODELS = {
  xai: ["grok-4.20-0309-non-reasoning"],
  deepseek: ["deepseek-v4-flash", "deepseek-chat"],
  google: ["gemini-2.5-flash-lite", "gemini-2.5-flash"],
  moonshotai: ["kimi-k2-turbo"],
  alibaba: ["qwen3.5-flash"],
  "openai-compatible": ["use-custom-model"],
} as const

export const NON_API_TRANSLATE_PROVIDERS = ["google-translate", "microsoft-translate"] as const

export const NON_API_TRANSLATE_PROVIDERS_MAP = {
  "google-translate": "Google Translate",
  "microsoft-translate": "Microsoft Translator",
} as const

export const PURE_TRANSLATE_PROVIDERS = NON_API_TRANSLATE_PROVIDERS

export const LLM_MODEL_OPTIONS: Array<{
  pattern: RegExp
  options: Record<string, JSONValue>
}> = []
