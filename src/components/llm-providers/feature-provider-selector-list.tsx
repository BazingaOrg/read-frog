import type { ComponentProps } from "react"
import type { FeatureKey } from "@/utils/constants/feature-providers"
import ProviderSelector from "@/components/llm-providers/provider-selector"
import { Field, FieldGroup, FieldTitle } from "@/components/ui/base-ui/field"
import { FEATURE_KEYS, getFeatureLabelI18nKey } from "@/utils/constants/feature-providers"
import { i18n } from "@/utils/i18n"
import { cn } from "@/utils/styles/utils"
import { SetApiKeyWarning } from "./set-api-key-warning"
import { useFeatureProvider } from "./use-feature-providers"

type ProviderSelectorTriggerSize = ComponentProps<typeof ProviderSelector>["triggerSize"]

interface FeatureProviderSelectorListProps {
  className?: string
  providerSelectorClassName?: string
  providerSelectorTriggerSize?: ProviderSelectorTriggerSize
}

function FeatureProviderField({
  featureKey,
  providerSelectorClassName,
  providerSelectorTriggerSize,
}: {
  featureKey: FeatureKey
  providerSelectorClassName?: string
  providerSelectorTriggerSize?: ProviderSelectorTriggerSize
}) {
  const { providers, providerId, providerConfig, setProviderId } = useFeatureProvider(featureKey)

  return (
    <Field>
      <FieldTitle className="flex flex-wrap items-center gap-2">
        {i18n.t(getFeatureLabelI18nKey(featureKey))}
        <SetApiKeyWarning providerConfig={providerConfig} />
      </FieldTitle>
      <ProviderSelector
        providers={providers}
        value={providerId}
        onChange={setProviderId}
        className={providerSelectorClassName}
        triggerSize={providerSelectorTriggerSize}
      />
    </Field>
  )
}

export function FeatureProviderSelectorList({
  className,
  providerSelectorClassName = "w-full",
  providerSelectorTriggerSize,
}: FeatureProviderSelectorListProps) {
  return (
    <FieldGroup className={cn("gap-4", className)}>
      {FEATURE_KEYS.map((featureKey) => (
        <FeatureProviderField
          key={featureKey}
          featureKey={featureKey}
          providerSelectorClassName={providerSelectorClassName}
          providerSelectorTriggerSize={providerSelectorTriggerSize}
        />
      ))}
    </FieldGroup>
  )
}
