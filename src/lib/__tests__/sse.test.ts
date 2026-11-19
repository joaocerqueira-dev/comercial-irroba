import { describe, expect, it, vi } from "vitest";
import { readEventStream, StreamEndedError, type SseEvent } from "@/lib/sse/readEventStream";

function streamOf(...parts: string[]) {
  const enc = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(c) {
      parts.forEach((p) => c.enqueue(enc.encode(p)));
      c.close();
    },
  });
}

describe("readEventStream", () => {
  it("lê eventos quebrados entre chunks e para no terminal", async () => {
    const seen: SseEvent[] = [];
    await readEventStream(
      streamOf('event: progress\ndata: {"progress":', '20}\n\nevent: done\ndata: {"id":"x"}\n\n'),
      (e) => {
        seen.push(e);
        return e.event === "done";
      }
    );
    expect(seen.map((e) => e.event)).toEqual(["progress", "done"]);
    expect(seen[0].data.progress).toBe(20);
  });
  it("ignora JSON inválido e lança erro se terminar sem evento terminal", async () => {
    await expect(
      readEventStream(streamOf("event: progress\ndata: {quebrado\n\n"), () => false)
    ).rejects.toBeInstanceOf(StreamEndedError);
  });
  it("cancela o stream ao parar no evento terminal", async () => {
    const cancel = vi.fn();
    const enc = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(enc.encode('event: done\ndata: {"id":"x"}\n\n'));
        // stream fica aberto (sem close)
      },
      cancel,
    });
    await readEventStream(body, (e) => e.event === "done");
    expect(cancel).toHaveBeenCalled();
  });
  it("finaliza o decoder com multibyte cortado no fim do stream", async () => {
    const bytes = new TextEncoder().encode('event: done\ndata: {"msg":"ação"}\n\n');
    const cut = bytes.length - 6; // corta no meio de "ç"/"ã"
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(bytes.slice(0, cut));
        c.enqueue(bytes.slice(cut));
        c.close();
      },
    });
    const seen: SseEvent[] = [];
    await readEventStream(body, (e) => {
      seen.push(e);
      return true;
    });
    expect(seen[0].data.msg).toBe("ação");
  });
});
