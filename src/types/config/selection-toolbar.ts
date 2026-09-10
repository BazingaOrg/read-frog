import { z } from "zod"
import { pageTranslationShortcutSchema } from "./translate"

export const selectionToolbarSchema = z.object({
  enabled: z.boolean(),
  disabledSelectionToolbarPatterns: z.array(z.string()),
  opacity: z.number().min(1).max(100),
  features: z.object({
    translate: z.object({
      enabled: z.boolean(),
      shortcut: pageTranslationShortcutSchema,
    }),
    speak: z.object({
      enabled: z.boolean(),
    }),
  }),
})

export type SelectionToolbarConfig = z.infer<typeof selectionToolbarSchema>
