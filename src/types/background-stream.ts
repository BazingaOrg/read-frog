import type { JSONValue } from "ai"
import type { Browser } from "#imports"
import type { AISDKReasoning } from "@/types/config/provider"

export interface BackgroundStreamTextSerializablePayload {
  providerId: string
  instructions?: string
  prompt?: string
  messages?: JSONValue[]
  temperature?: number
  topP?: number
  maxOutputTokens?: number
  frequencyPenalty?: number
  presencePenalty?: number
  seed?: number
  stopSequences?: string[]
  reasoning?: AISDKReasoning
  providerOptions?: Record<string, Record<string, JSONValue>>
}

export type HostedAiTextStreamRoute =
  | "pageTranslation"
  | "selectionTranslation"
  | "videoSubtitles"
  | "videoSubtitlesSegmentation"

export interface ThinkingSnapshot {
  status: "thinking" | "complete"
  text: string
}

export interface BackgroundStreamSnapshot<TOutput> {
  output: TOutput
  thinking: ThinkingSnapshot
}

export type BackgroundTextStreamSnapshot = BackgroundStreamSnapshot<string>

export const BACKGROUND_STREAM_PORTS = { streamText: "stream-text" } as const
export type BackgroundStreamPortName =
  (typeof BACKGROUND_STREAM_PORTS)[keyof typeof BACKGROUND_STREAM_PORTS]
export interface BackgroundStreamResponseMap {
  streamText: BackgroundTextStreamSnapshot
}

export type StreamPortResponse<T = string> =
  | { type: "chunk"; requestId: string; data: T }
  | { type: "done"; requestId: string; data: T }
  | { type: "error"; requestId: string; error: { message: string } }

export interface StreamPortStartMessage<TSerializablePayload> {
  type: "start"
  requestId: string
  payload: TSerializablePayload
}

export type StreamPortRequestMessage<TSerializablePayload> =
  | StreamPortStartMessage<TSerializablePayload>
  | { type: "ping"; requestId: string }

export type StreamPortHandler = (port: Browser.runtime.Port) => void
