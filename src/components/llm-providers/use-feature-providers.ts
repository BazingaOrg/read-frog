import type { ProviderConfig } from "@/types/config/provider"
import type { FeatureKey } from "@/utils/constants/feature-providers"
import type { ProviderSelectorOption } from "@/utils/providers/provider-display"
import { useAtomValue, useSetAtom } from "jotai"
import { useCallback, useMemo } from "react"
import { configAtom, configFieldsAtomMap, writeConfigAtom } from "@/utils/atoms/config"
import { getProviderConfigById } from "@/utils/config/helpers"
import {
  buildFeatureProviderPatch,
  FEATURE_PROVIDER_DEFS,
} from "@/utils/constants/feature-providers"
import { getSelectableProvidersForCapability } from "@/utils/providers/provider-registry"
import { providerSupportsTranslationOnlyMode } from "@/utils/providers/translation-only-gate"

export interface FeatureProviderBinding {
  providers: ProviderSelectorOption[]
  providerId: string
  providerConfig: ProviderConfig | null
  setProviderId: (providerId: string) => void
}

export function useFeatureProvider(featureKey: FeatureKey): FeatureProviderBinding {
  const config = useAtomValue(configAtom)
  const setConfig = useSetAtom(writeConfigAtom)
  const providersConfig = useAtomValue(configFieldsAtomMap.providersConfig)
  const translationMode = useAtomValue(configFieldsAtomMap.pageTranslation).mode
  const providerId = FEATURE_PROVIDER_DEFS[featureKey].getProviderId(config) ?? ""
  const providers = useMemo(() => {
    const candidates = getSelectableProvidersForCapability(featureKey, providersConfig)
    if (featureKey !== "translation" || translationMode !== "translationOnly") return candidates
    return candidates.filter((option) => providerSupportsTranslationOnlyMode(option.provider))
  }, [featureKey, providersConfig, translationMode])
  const setProviderId = useCallback(
    (id: string) => void setConfig(buildFeatureProviderPatch({ [featureKey]: id })),
    [featureKey, setConfig],
  )

  return {
    providers,
    providerId,
    providerConfig: getProviderConfigById(providersConfig, providerId) ?? null,
    setProviderId,
  }
}
