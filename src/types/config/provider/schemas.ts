import type {
  APIProviderTypes,
  DedicatedLLMProviderTypes,
  LLMProviderTypes,
  NonAPIProviderTypes,
  OpenAICompatibleLLMProviderTypes,
  ProtocolCompatibleLLMProviderTypes,
  TopLevelReasoningProviderTypes,
  TranslateProviderTypes,
} from "./constants"
import { z } from "zod"
import {
  AI_SDK_REASONING_VALUES,
  LLM_PROVIDER_MODELS,
  isCustomModelOnlyProvider,
} from "./constants"

export const providerSponsorConfigSchema = z.object({
  sponsoring: z.boolean(),
  referUrl: z.url(),
  badgeI18nKey: z.string().optional(),
  ctaI18nKey: z.string().optional(),
})
export type ProviderSponsorConfig = z.infer<typeof providerSponsorConfigSchema>

export const baseProviderConfigSchema = z.strictObject({
  id: z.string().nonempty(),
  name: z.string().nonempty(),
  description: z.string().optional(),
  enabled: z.boolean(),
})

export const baseAPIProviderConfigSchema = baseProviderConfigSchema.extend({
  apiKey: z.string().optional(),
  baseURL: z.string().optional(),
  temperature: z.number().min(0).optional(),
  providerOptions: z.record(z.string(), z.any()).optional(),
  headers: z.record(z.string(), z.any()).optional(),
})

export const baseOpenAICompatibleLLMProviderConfigSchema = baseAPIProviderConfigSchema.extend({
  baseURL: z.string(),
})

export const baseOpenResponsesLLMProviderConfigSchema = baseAPIProviderConfigSchema

function createProviderModelSchema<T extends LLMProviderTypes>(provider: T) {
  return z.object({
    model: z.enum(LLM_PROVIDER_MODELS[provider]),
    isCustomModel: isCustomModelOnlyProvider(provider) ? z.literal(true) : z.boolean(),
    customModel: z.string().nullable(),
  })
}

const reasoningSchema = { reasoning: z.enum(AI_SDK_REASONING_VALUES).optional() }

const llmProviderConfigSchemaList = [
  baseAPIProviderConfigSchema.extend({
    provider: z.literal("xai"),
    model: createProviderModelSchema("xai"),
    ...reasoningSchema,
  }),
  baseAPIProviderConfigSchema.extend({
    provider: z.literal("deepseek"),
    model: createProviderModelSchema("deepseek"),
    ...reasoningSchema,
  }),
  baseAPIProviderConfigSchema.extend({
    provider: z.literal("google"),
    model: createProviderModelSchema("google"),
    ...reasoningSchema,
  }),
  baseAPIProviderConfigSchema.extend({
    provider: z.literal("moonshotai"),
    model: createProviderModelSchema("moonshotai"),
  }),
  baseAPIProviderConfigSchema.extend({
    provider: z.literal("alibaba"),
    model: createProviderModelSchema("alibaba"),
  }),
  baseOpenAICompatibleLLMProviderConfigSchema.extend({
    provider: z.literal("openai-compatible"),
    model: createProviderModelSchema("openai-compatible"),
  }),
] as const

export const providerConfigSchemaList = [
  ...llmProviderConfigSchemaList,
  baseProviderConfigSchema.extend({ provider: z.literal("google-translate") }),
  baseProviderConfigSchema.extend({ provider: z.literal("microsoft-translate") }),
] as const

export const llmProviderConfigItemSchema = z.discriminatedUnion(
  "provider",
  llmProviderConfigSchemaList,
)
export const apiProviderConfigItemSchema = llmProviderConfigItemSchema
export const providerConfigItemSchema = z.discriminatedUnion("provider", providerConfigSchemaList)

export const providersConfigSchema = z
  .array(providerConfigItemSchema)
  .superRefine((providers, ctx) => {
    for (const field of ["id", "name"] as const) {
      const seen = new Set<string>()
      providers.forEach((provider, index) => {
        if (seen.has(provider[field])) {
          ctx.addIssue({
            code: "custom",
            message: `Duplicate provider ${field} "${provider[field]}"`,
            path: [index, field],
          })
        }
        seen.add(provider[field])
      })
    }
  })

export type ProvidersConfig = z.infer<typeof providersConfigSchema>
export type ProviderConfig = ProvidersConfig[number]
export type NonAPIProviderConfig = Extract<ProviderConfig, { provider: NonAPIProviderTypes }>
export type PureProviderConfig = never
export type APIProviderConfig = Extract<ProviderConfig, { provider: APIProviderTypes }>
export type PureAPIProviderConfig = never
export type LLMProviderConfig = Extract<ProviderConfig, { provider: LLMProviderTypes }>
export type TranslateProviderConfig = Extract<ProviderConfig, { provider: TranslateProviderTypes }>
export type OpenAICompatibleLLMProviderConfig = Extract<
  ProviderConfig,
  { provider: OpenAICompatibleLLMProviderTypes }
>
export type OpenResponsesLLMProviderConfig = never
export type ProtocolCompatibleLLMProviderConfig = Extract<
  ProviderConfig,
  { provider: ProtocolCompatibleLLMProviderTypes }
>
export type DedicatedLLMProviderConfig = Extract<
  ProviderConfig,
  { provider: DedicatedLLMProviderTypes }
>
export type TopLevelReasoningProviderConfig = Extract<
  LLMProviderConfig,
  { provider: TopLevelReasoningProviderTypes }
>

function modelConfigSchema<T extends readonly [string, ...string[]]>(models: T) {
  return z.object({
    model: z.enum(models),
    isCustomModel: z.boolean(),
    customModel: z.string().nullable(),
  })
}

export const llmProviderModelsSchema = z.object({
  xai: modelConfigSchema(LLM_PROVIDER_MODELS.xai),
  deepseek: modelConfigSchema(LLM_PROVIDER_MODELS.deepseek),
  google: modelConfigSchema(LLM_PROVIDER_MODELS.google),
  moonshotai: modelConfigSchema(LLM_PROVIDER_MODELS.moonshotai),
  alibaba: modelConfigSchema(LLM_PROVIDER_MODELS.alibaba),
  "openai-compatible": modelConfigSchema(LLM_PROVIDER_MODELS["openai-compatible"]),
})
export type LLMProviderModels = z.infer<typeof llmProviderModelsSchema>
