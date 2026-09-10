import type { APIProviderConfig, ProviderConfig } from "@/types/config/provider"
import { useAtom } from "jotai"
import ProviderIcon from "@/components/provider-icon"
import { useTheme } from "@/components/providers/theme-provider"
import { Input } from "@/components/ui/base-ui/input"
import { Switch } from "@/components/ui/base-ui/switch"
import { isAPIProviderConfig } from "@/types/config/provider"
import { configFieldsAtomMap } from "@/utils/atoms/config"
import { PROVIDER_ITEMS } from "@/utils/constants/providers"
import { i18n } from "@/utils/i18n"
import { resolveModelId } from "@/utils/providers/model-id"
import { ConfigSection } from "../../../components/config-section"

function ProviderRow({
  provider,
  onChange,
}: {
  provider: ProviderConfig
  onChange: (provider: ProviderConfig) => void
}) {
  const { theme } = useTheme()
  const item = PROVIDER_ITEMS[provider.provider]
  const apiProvider = isAPIProviderConfig(provider) ? provider : null
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <ProviderIcon logo={item?.logo(theme) ?? ""} name={provider.name} size="md" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{provider.name}</p>
          <p className="text-xs text-muted-foreground">{provider.provider}</p>
        </div>
        <Switch
          checked={provider.enabled}
          onCheckedChange={(enabled) => onChange({ ...provider, enabled })}
        />
      </div>
      {apiProvider ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input
            type="password"
            value={apiProvider.apiKey ?? ""}
            placeholder="API key"
            onChange={(event) => onChange({ ...apiProvider, apiKey: event.target.value })}
          />
          <Input
            value={resolveModelId(apiProvider.model) ?? ""}
            placeholder="Model ID"
            onChange={(event) =>
              onChange({
                ...apiProvider,
                model: {
                  ...apiProvider.model,
                  isCustomModel: true,
                  customModel: event.target.value,
                },
              } as APIProviderConfig)
            }
          />
          {apiProvider.provider === "openai-compatible" ? (
            <Input
              className="md:col-span-2"
              value={apiProvider.baseURL}
              placeholder="Base URL"
              onChange={(event) => onChange({ ...apiProvider, baseURL: event.target.value })}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function ProvidersConfig() {
  const [providers, setProviders] = useAtom(configFieldsAtomMap.providersConfig)
  const updateProvider = (nextProvider: ProviderConfig) =>
    setProviders(
      providers.map((provider) => (provider.id === nextProvider.id ? nextProvider : provider)),
    )

  return (
    <ConfigSection title={i18n.t("options.apiProviders.title")}>
      {providers.map((provider) => (
        <ProviderRow key={provider.id} provider={provider} onChange={updateProvider} />
      ))}
    </ConfigSection>
  )
}
