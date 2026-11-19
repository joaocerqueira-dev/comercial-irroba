export interface SseEvent {
  event: string;
  data: Record<string, unknown>;
}

export class StreamEndedError extends Error {
  constructor(message = "A conexão terminou antes da geração concluir. Tente novamente.") {
    super(message);
    this.name = "StreamEndedError";
  }
}

/** Faz o parse de um bloco SSE ("event: x\ndata: {...}"). Retorna null se inválido. */
export function parseSseChunk(chunk: string): SseEvent | null {
  const eventMatch = chunk.match(/^event:\s*(.+)$/m);
  const dataLines = [...chunk.matchAll(/^data:\s?(.*)$/gm)].map((m) => m[1]);
  if (!eventMatch || dataLines.length === 0) return null;
  try {
    const data = JSON.parse(dataLines.join("\n"));
    if (!data || typeof data !== "object") return null;
    return { event: eventMatch[1].trim(), data: data as Record<string, unknown> };
  } catch {
    return null;
  }
}

/**
 * Lê um stream SSE e chama onEvent para cada evento. Para quando onEvent devolve
 * true (evento terminal). Se o stream acabar sem evento terminal, lança StreamEndedError.
 */
export async function readEventStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (evt: SseEvent) => boolean | void | Promise<boolean | void>
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (value) buffer += decoder.decode(value, { stream: !done });
      const chunks = buffer.split(/\r?\n\r?\n/);
      buffer = done ? "" : (chunks.pop() ?? "");
      for (const chunk of chunks) {
        if (!chunk.trim()) continue;
        const evt = parseSseChunk(chunk);
        if (!evt) continue;
        if (await onEvent(evt)) return;
      }
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
  throw new StreamEndedError();
}
