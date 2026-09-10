import type { Browser } from "#imports"
import type { BackgroundGenerateTextPayload } from "@/types/background-generate-text"
import type {
  BackgroundStreamTextSerializablePayload,
  BackgroundTextStreamSnapshot,
  StreamPortRequestMessage,
  StreamPortResponse,
} from "@/types/background-stream"
import { generateText, streamText } from "ai"
import { z } from "zod"
import { BACKGROUND_STREAM_PORTS } from "@/types/background-stream"
import { isLLMProviderConfig } from "@/types/config/provider"
import { buildLocalGenerateTextParams } from "@/utils/providers/generate-params"
import { getModelById } from "@/utils/providers/model"
import { getLanguageModelForConfig } from "@/utils/providers/model"

const payloadSchema = z.object({ providerId: z.string().trim().min(1) }).loose()

export function handleStreamTextPort(port: Browser.runtime.Port) {
  const abortController = new AbortController()
  port.onDisconnect.addListener(() => abortController.abort())
  port.onMessage.addListener((message: StreamPortRequestMessage<unknown>) => {
    if (message.type !== "start") return
    const parsed = payloadSchema.safeParse(message.payload)
    if (!parsed.success) {
      port.postMessage({
        type: "error",
        requestId: message.requestId,
        error: { message: "Invalid stream start payload" },
      } satisfies StreamPortResponse<BackgroundTextStreamSnapshot>)
      return
    }
    void runLocalTextStream(port, message.requestId, parsed.data, abortController.signal)
  })
}

async function runLocalTextStream(
  port: Browser.runtime.Port,
  requestId: string,
  payload: BackgroundStreamTextSerializablePayload,
  signal: AbortSignal,
) {
  try {
    const { providerId, ...params } = payload
    const model = await getModelById(providerId)
    const result = streamText({
      ...(params as Parameters<typeof streamText>[0]),
      model,
      abortSignal: signal,
    })
    let output = ""
    for await (const chunk of result.textStream) {
      output += chunk
      port.postMessage({
        type: "chunk",
        requestId,
        data: { output, thinking: { status: "thinking", text: "" } },
      } satisfies StreamPortResponse<BackgroundTextStreamSnapshot>)
    }
    port.postMessage({
      type: "done",
      requestId,
      data: { output, thinking: { status: "complete", text: "" } },
    } satisfies StreamPortResponse<BackgroundTextStreamSnapshot>)
  } catch (error) {
    if (signal.aborted) return
    port.postMessage({
      type: "error",
      requestId,
      error: { message: error instanceof Error ? error.message : String(error) },
    } satisfies StreamPortResponse<BackgroundTextStreamSnapshot>)
  }
}

export async function runStreamTextInBackground(
  payload: BackgroundStreamTextSerializablePayload,
  options: {
    signal?: AbortSignal
    onChunk?: (snapshot: BackgroundTextStreamSnapshot) => void
  } = {},
): Promise<BackgroundTextStreamSnapshot> {
  const { providerId, ...params } = payload
  const model = await getModelById(providerId)
  const result = streamText({
    ...(params as Parameters<typeof streamText>[0]),
    model,
    abortSignal: options.signal,
  })
  let output = ""
  for await (const chunk of result.textStream) {
    output += chunk
    options.onChunk?.({ output, thinking: { status: "thinking", text: "" } })
  }
  return { output, thinking: { status: "complete", text: "" } }
}

export async function generateTextForProviderRef(
  payload: BackgroundGenerateTextPayload,
  options: { signal?: AbortSignal } = {},
): Promise<string> {
  const providerRef = payload.providerRef
  const config = providerRef.config
  if (!isLLMProviderConfig(config)) {
    throw new Error(`Provider ${config.id} cannot generate text`)
  }
  const model = getLanguageModelForConfig(config)
  const result = await generateText({
    model,
    instructions: payload.instructions,
    prompt: payload.prompt,
    abortSignal: options.signal,
    maxRetries: payload.maxRetries,
    ...buildLocalGenerateTextParams(config),
  })
  return result.text
}

export function dispatchBackgroundStreamPort(port: Browser.runtime.Port): boolean {
  if (port.name !== BACKGROUND_STREAM_PORTS.streamText) return false
  handleStreamTextPort(port)
  return true
}
