import { describe, expect, it } from "vitest";
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
});
