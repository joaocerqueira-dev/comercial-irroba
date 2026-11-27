import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({ generateImage: vi.fn(), generateText: vi.fn() }));
vi.mock("ai", async (orig) => ({ ...(await orig<typeof import("ai")>()), ...sdk }));
// Art Studio sem Playwright nos testes
vi.mock("@/lib/net/rate-limit", async (orig) => ({
  ...(await orig<typeof import("@/lib/net/rate-limit")>()),
  withBrowserSlot: vi.fn(async () => Buffer.from("png-art-studio")),
}));

import { AiImageModeUnsupportedError, processAiImageRequest, type AiImageRequest } from "@/lib/ai/image-studio";

const baseReq: AiImageRequest = {
  previewId: "test-user-ai",
  prompt: "banner",
  mode: "generate",
  aspectRatio: "3:4",
  brandName: "Loja",
  niche: "moda",
  palette: { primary: "#000", primaryFg: "#fff", secondary: "#111", secondaryFg: "#fff", neutral: "#eee" },
};
const google = { provider: "google" as const, modelId: "meu-modelo-imagem", apiKey: "chave-do-usuario" };
const openai = { provider: "openai" as const, modelId: "gpt-image-1.5", apiKey: "sk-usuario" };
const created: string[] = [];
const track = (url: string) => created.push(path.join(process.cwd(), "public", "captures", path.basename(url)));

beforeEach(() => vi.clearAllMocks());
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(created.splice(0).map((f) => fs.rm(f, { force: true })));
});

describe("processAiImageRequest com a IA do usuário", () => {
  it("google: uma chamada só, com a chave e o modelo do usuário", async () => {
    const png = Buffer.alloc(400, 1).toString("base64");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: png } }] } }] }))
    );
    const result = await processAiImageRequest(baseReq, { imageAi: google });
    track(result.imageUrl);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("meu-modelo-imagem");
    expect(url).not.toContain("chave-do-usuario");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("chave-do-usuario");
    expect(result.modelUsed).toBe("meu-modelo-imagem");
  });

  it("google com falha: Art Studio com direção de arte da IA de texto e aviso da falha", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("API key not valid", { status: 403 }));
    sdk.generateText.mockResolvedValueOnce({ text: '```json\n{"headline":"Nova coleção"}\n```' });
    const textAi = { provider: "anthropic", modelId: "claude-x", model: {}, supportsImageInput: true } as never;
    const result = await processAiImageRequest(baseReq, { imageAi: google, textAi });
    track(result.imageUrl);
    expect(sdk.generateText).toHaveBeenCalledTimes(1);
    expect(result.modelUsed).toContain("claude-x");
    expect(result.notice).toContain("Chave da sua IA inválida ou sem permissão. Confira em Minha IA.");
    expect(result.notice).not.toContain("chave-do-usuario");
  });

  it("openai + enhance: modo não suportado", async () => {
    await expect(
      processAiImageRequest({ ...baseReq, mode: "enhance" }, { imageAi: openai })
    ).rejects.toBeInstanceOf(AiImageModeUnsupportedError);
    expect(sdk.generateImage).not.toHaveBeenCalled();
  });

  it("openai + generate: generateImage com o size da proporção", async () => {
    sdk.generateImage.mockResolvedValueOnce({
      image: { uint8Array: new Uint8Array(400).fill(2), mediaType: "image/png", base64: "" },
    });
    const result = await processAiImageRequest(baseReq, { imageAi: openai });
    track(result.imageUrl);
    expect(sdk.generateImage).toHaveBeenCalledTimes(1);
    expect(sdk.generateImage.mock.calls[0][0]).toMatchObject({ size: "1024x1536" });
    expect(sdk.generateImage.mock.calls[0][0].model.modelId).toBe("gpt-image-1.5");
    expect(result.modelUsed).toBe("gpt-image-1.5");
    expect(result.imageUrl).toMatch(/\.png$/);
  });
});
