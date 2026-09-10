import type { LangCodeISO6393 } from "@read-frog/definitions"
import { langCodeISO6393Schema } from "@read-frog/definitions"
import { franc } from "franc"

const DEFAULT_MIN_LENGTH = 10

export type DetectionSource = "franc" | "fallback"

export interface DetectLanguageOptions {
  minLength?: number
}

export interface DetectLanguageResult {
  code: LangCodeISO6393 | "und"
  source: DetectionSource
}

export async function detectLanguageWithSource(
  text: string,
  options?: DetectLanguageOptions,
): Promise<DetectLanguageResult> {
  const trimmedText = text.trim()
  if (trimmedText.length < (options?.minLength ?? DEFAULT_MIN_LENGTH)) {
    return { code: "und", source: "fallback" }
  }
  const detected = franc(trimmedText)
  const parsed = langCodeISO6393Schema.safeParse(detected)
  return parsed.success
    ? { code: parsed.data, source: "franc" }
    : { code: "und", source: "fallback" }
}

export async function detectLanguage(
  text: string,
  options?: DetectLanguageOptions,
): Promise<LangCodeISO6393 | null> {
  const result = await detectLanguageWithSource(text, options)
  return result.code === "und" ? null : result.code
}
