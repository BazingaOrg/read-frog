import type { ContextSnapshot, SelectionSnapshot } from "../utils"
import type { Config } from "@/types/config/config"
import type { ProviderRefForCapability } from "@/utils/providers/provider-registry"
import { dequal } from "dequal"
import { atom } from "jotai"
import { selectAtom } from "jotai/utils"
import { configAtom } from "@/utils/atoms/config"
import { resolveProviderRefForCapability } from "@/utils/providers/provider-registry"
import { buildContextSnapshot } from "../utils"

export interface SelectionSession {
  id: number
  createdAt: number
  selectionSnapshot: SelectionSnapshot
  contextSnapshot: ContextSnapshot
}

let nextSelectionSessionId = 0

function createSelectionSession(
  selection: SelectionSnapshot | null,
  context: ContextSnapshot | null,
): SelectionSession | null {
  if (!selection) return null
  const nextContext = context ?? buildContextSnapshot(selection)
  if (!nextContext) return null
  return {
    id: ++nextSelectionSessionId,
    createdAt: Date.now(),
    selectionSnapshot: selection,
    contextSnapshot: nextContext,
  }
}

export const selectionSessionAtom = atom<SelectionSession | null>(null)
export const selectionAtom = atom(
  (get) => get(selectionSessionAtom)?.selectionSnapshot ?? null,
  (_get, set, selection: SelectionSnapshot | null) =>
    set(selectionSessionAtom, createSelectionSession(selection, null)),
)
export const contextAtom = atom(
  (get) => get(selectionSessionAtom)?.contextSnapshot ?? null,
  (get, set, context: ContextSnapshot | null) =>
    set(selectionSessionAtom, createSelectionSession(get(selectionAtom), context)),
)
export const isSelectionToolbarVisibleAtom = atom(false)
export const selectionContentAtom = atom((get) => get(selectionAtom)?.text ?? null)
export const setSelectionStateAtom = atom(
  null,
  (
    _get,
    set,
    nextState: { selection: SelectionSnapshot | null; context: ContextSnapshot | null },
  ) => set(selectionSessionAtom, createSelectionSession(nextState.selection, nextState.context)),
)
export const clearSelectionStateAtom = atom(null, (_get, set) => set(selectionSessionAtom, null))

export interface SelectionToolbarTranslateRequestSlice {
  language: Config["language"]
  enableAIContentAware: boolean
  customPromptsConfig: Config["pageTranslation"]["customPromptsConfig"]
  provider: ProviderRefForCapability<"translation"> | null
}

export const selectionToolbarTranslateRequestAtom = selectAtom(
  configAtom,
  (config): SelectionToolbarTranslateRequestSlice => ({
    language: config.language,
    enableAIContentAware: config.pageTranslation.enableAIContentAware,
    customPromptsConfig: config.pageTranslation.customPromptsConfig,
    provider: resolveProviderRefForCapability(
      "translation",
      config.providersConfig,
      config.providerAssignments.translationProviderId,
    ),
  }),
  dequal,
)
