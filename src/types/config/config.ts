import { langCodeISO6393Schema, langLevel } from "@read-frog/definitions"
import { z } from "zod"
import { FEATURE_KEYS, FEATURE_PROVIDER_DEFS } from "@/utils/constants/feature-providers"
import { MIN_SIDE_CONTENT_WIDTH } from "@/utils/constants/side"
import { DEFAULT_TRANSLATION_HUB_SHORTCUT_KEY } from "@/utils/constants/translation-hub"
import {
  doesProviderSupportsCapability,
  getProviderIdsForCapability,
} from "@/utils/providers/provider-registry"
import { floatingButtonSchema } from "./floating-button"
import { providersConfigSchema } from "./provider"
import { selectionToolbarSchema } from "./selection-toolbar"
import { siteRulesConfigSchema } from "./site-rules"
import { videoSubtitlesSchema } from "./subtitles"
import { pageTranslationShortcutSchema, translateConfigSchema } from "./translate"
import { ttsConfigSchema } from "./tts"

const languageSchema = z.object({
  sourceCode: langCodeISO6393Schema.or(z.literal("auto")),
  targetCode: langCodeISO6393Schema,
  level: langLevel,
})

export const providerAssignmentsSchema = z.object({
  translationProviderId: z.string().nonempty(),
  subtitleProviderId: z.string().nonempty(),
  vocabularyProviderId: z.string().nonempty().optional(),
})

const sideContentSchema = z.object({
  width: z.number().min(MIN_SIDE_CONTENT_WIDTH),
})

const translationHubSchema = z
  .object({ shortcut: pageTranslationShortcutSchema })
  .default({ shortcut: DEFAULT_TRANSLATION_HUB_SHORTCUT_KEY })

const betaExperienceSchema = z.object({ enabled: z.boolean() })
const contextMenuSchema = z.object({ enabled: z.boolean() })

const siteControlSchema = z.object({
  mode: z.enum(["blacklist", "whitelist"]),
  blacklistPatterns: z.array(z.string()),
  whitelistPatterns: z.array(z.string()),
})

const uiLanguageSchema = z
  .enum(["auto", "en", "es", "ja", "ko", "ru", "tr", "vi", "zh-CN", "zh-TW"])
  .default("auto")
export type UiLanguage = z.infer<typeof uiLanguageSchema>

export const configSchema = z
  .object({
    language: languageSchema,
    providersConfig: providersConfigSchema,
    providerAssignments: providerAssignmentsSchema,
    pageTranslation: translateConfigSchema,
    tts: ttsConfigSchema,
    floatingButton: floatingButtonSchema,
    selectionToolbar: selectionToolbarSchema,
    sideContent: sideContentSchema,
    betaExperience: betaExperienceSchema,
    contextMenu: contextMenuSchema,
    videoSubtitles: videoSubtitlesSchema,
    siteControl: siteControlSchema,
    siteRules: siteRulesConfigSchema,
    uiLanguage: uiLanguageSchema,
    translationHub: translationHubSchema,
  })
  .superRefine((data, ctx) => {
    for (const featureKey of FEATURE_KEYS) {
      const def = FEATURE_PROVIDER_DEFS[featureKey]
      const providerId = def.getProviderId(data)
      if (
        providerId &&
        !doesProviderSupportsCapability(featureKey, data.providersConfig, providerId, {
          requireEnable: true,
        })
      ) {
        ctx.addIssue({
          code: "invalid_value",
          values: getProviderIdsForCapability(featureKey, data.providersConfig, {
            requireEnable: true,
          }),
          message: `Invalid provider id "${providerId}".`,
          path: [...def.configPath],
        })
      }
    }
  })

export type Config = z.infer<typeof configSchema>
