import type { FeatureKey } from "@/utils/constants/feature-providers"
import ProviderSelector from "@/components/llm-providers/provider-selector"
import { SetApiKeyWarning } from "@/components/llm-providers/set-api-key-warning"
import { useFeatureProvider } from "@/components/llm-providers/use-feature-providers"
import {
  FEATURE_KEYS,
  getFeatureDescriptionI18nKey,
  getFeatureLabelI18nKey,
} from "@/utils/constants/feature-providers"
import { i18n } from "@/utils/i18n"
import { ConfigItem } from "../../../components/config-item"
import { ConfigSection } from "../../../components/config-section"
import { SELECT_CONTENT_PROPS } from "../../../components/select-content-props"

function FeatureProviderItem({ featureKey }: { featureKey: FeatureKey }) {
  const { providers, providerId, providerConfig, setProviderId } = useFeatureProvider(featureKey)
  return (
    <ConfigItem
      title={
        <span className="flex flex-wrap items-center gap-2">
          {i18n.t(getFeatureLabelI18nKey(featureKey))}
          <SetApiKeyWarning providerConfig={providerConfig} />
        </span>
      }
      description={i18n.t(getFeatureDescriptionI18nKey(featureKey))}
    >
      <ProviderSelector
        providers={providers}
        value={providerId}
        onChange={setProviderId}
        triggerSize="sm"
        selectContentProps={SELECT_CONTENT_PROPS}
      />
    </ConfigItem>
  )
}

export function FeatureProvidersConfig() {
  return (
    <ConfigSection
      id="feature-providers"
      title={i18n.t("options.apiProviders.featureProviders.title")}
    >
      {FEATURE_KEYS.map((featureKey) => (
        <FeatureProviderItem key={featureKey} featureKey={featureKey} />
      ))}
    </ConfigSection>
  )
}
