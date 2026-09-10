import type {
  BackgroundStreamResponseMap,
  BackgroundStreamTextSerializablePayload,
} from "@/types/background-stream"
import { BACKGROUND_STREAM_PORTS } from "@/types/background-stream"
import { createPortStreamPromise } from "./port-streaming"

export interface ContentScriptStreamOptions<TResponse = string> {
  signal?: AbortSignal
  onChunk?: (data: TResponse) => void
  keepAliveIntervalMs?: number
}

export function streamBackgroundText(
  serializablePayload: BackgroundStreamTextSerializablePayload,
  options: ContentScriptStreamOptions<BackgroundStreamResponseMap["streamText"]> = {},
) {
  return createPortStreamPromise<BackgroundStreamResponseMap["streamText"]>(
    BACKGROUND_STREAM_PORTS.streamText,
    serializablePayload,
    options,
  )
}
