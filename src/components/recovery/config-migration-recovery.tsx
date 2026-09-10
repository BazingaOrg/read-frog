import type { ConfigMigrationRecoveryRecord } from "@/utils/config/recovery"
import { IconAlertCircle } from "@tabler/icons-react"
import { kebabCase } from "case-anything"
import { saveAs } from "file-saver"
import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/base-ui/alert-dialog"
import { Button } from "@/components/ui/base-ui/button"
import { getObjectWithoutAPIKeys } from "@/utils/config/api"
import { resetConfigFromRecovery } from "@/utils/config/recovery"
import { APP_NAME } from "@/utils/constants/app"
import { buildFreshDefaultConfig } from "@/utils/constants/config"
import { i18n } from "@/utils/i18n"
import { Alert, AlertDescription, AlertTitle } from "../ui/base-ui/alert"

interface ConfigMigrationRecoveryProps {
  error: Error
  recovery: ConfigMigrationRecoveryRecord | null
}

export function ConfigMigrationRecovery({ error, recovery }: ConfigMigrationRecoveryProps) {
  const [isResetting, setIsResetting] = useState(false)

  const exportSnapshot = (includeApiKeys: boolean) => {
    const rawConfig = recovery?.rawConfig
    const config = includeApiKeys
      ? rawConfig
      : getObjectWithoutAPIKeys({ config: rawConfig }).config
    const blob = new Blob(
      [
        JSON.stringify(
          {
            config,
            schemaVersion: recovery?.sourceVersion,
            recovery: recovery
              ? {
                  targetVersion: recovery.targetVersion,
                  error: recovery.error,
                  invalidPaths: recovery.invalidPaths,
                  createdAt: recovery.createdAt,
                }
              : undefined,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    )
    saveAs(blob, `${kebabCase(APP_NAME)}-config-recovery.json`)
  }

  const resetConfig = async () => {
    setIsResetting(true)
    try {
      await resetConfigFromRecovery(buildFreshDefaultConfig())
      window.location.reload()
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-background p-4 text-foreground md:p-6">
      <div className="mx-auto max-w-xl space-y-4 rounded-xl border bg-card p-4 md:p-6">
        <div className="space-y-2">
          <h1 className="text-lg font-semibold">{i18n.t("errorRecovery.title")}</h1>
          <p className="text-sm text-muted-foreground">{i18n.t("errorRecovery.description")}</p>
        </div>
        <Alert variant="destructive">
          <IconAlertCircle />
          <AlertTitle>{i18n.t("errorRecovery.errorDetails")}</AlertTitle>
          <AlertDescription>
            <p>{error.message}</p>
            {recovery?.invalidPaths.length ? (
              <p className="mt-2 break-words">{recovery.invalidPaths.join(", ")}</p>
            ) : null}
          </AlertDescription>
        </Alert>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportSnapshot(true)}>
            {i18n.t("errorRecovery.exportWithApiKeys")}
          </Button>
          <Button variant="outline" onClick={() => exportSnapshot(false)}>
            {i18n.t("errorRecovery.exportWithoutApiKeys")}
          </Button>
          <Button onClick={() => window.location.reload()}>
            {i18n.t("errorRecovery.refreshPage")}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" disabled={isResetting} />}>
              {i18n.t("errorRecovery.resetAction")}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{i18n.t("errorRecovery.resetDialog.title")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {i18n.t("errorRecovery.resetDialog.description")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{i18n.t("errorRecovery.resetDialog.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={resetConfig}
                  disabled={isResetting}
                >
                  {i18n.t("errorRecovery.resetDialog.confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}
