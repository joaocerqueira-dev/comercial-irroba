import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { buildExtractionWarning } from "@/lib/previews/extraction-warnings";
import { makeSampleExtracted } from "./fixtures";

const db = vi.hoisted(() => ({
  storePreview: {
    create: vi.fn(async () => ({ id: "p1" })),
    update: vi.fn(async (args: { data: Record<string, unknown> }) => ({
      id: "p1",
      slug: "loja",
      storeName: "Loja",
      detectedPlatform: "Irroba",
      generationMode: "heuristic",
      ...args.data,
    })),
    delete: vi.fn(),
  },
}));
vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/net/safe-url", async (orig) => ({
  ...(await orig<typeof import("@/lib/net/safe-url")>()),
  assertPublicHttpUrl: vi.fn(async () => undefined),
}));
const scraper = vi.hoisted(() => ({ extractStoreFromUrl: vi.fn() }));
vi.mock("@/lib/scraper/store-extractor", () => scraper);
const mobile = vi.hoisted(() => ({ captureMobileStoreScreenshots: vi.fn(async () => null as unknown) }));
vi.mock("@/lib/scraper/mobile-screenshot", () => mobile);
vi.mock("@/lib/ai/image-studio", () => ({
  buildImageRequestFromBlueprint: vi.fn(() => ({})),
  processAiImageRequest: vi.fn(async () => {
    throw new Error("sem IA nos testes");
  }),
}));
vi.mock("@/lib/ai/architect", async (orig) => {
  const mod = await orig<typeof import("@/lib/ai/architect")>();
  return {
    ...mod,
    buildStoreBlueprint: vi.fn(async (data: Parameters<typeof mod.buildHeuristicBlueprint>[0]) => ({
      blueprint: mod.buildHeuristicBlueprint(data),
      mode: "heuristic",
    })),
  };
});

// Sessão válida de admin (o guard roda antes de tudo; admin acessa qualquer proposta)
vi.mock("@/lib/auth/session", async (orig) => {
  const { TEST_USERS } = await import("./fixtures");
  return { ...(await orig<object>()), getUserFromToken: vi.fn(async () => TEST_USERS.admin) };
});

import { POST } from "@/app/api/previews/generate/route";

beforeEach(() => vi.clearAllMocks());

describe("buildExtractionWarning", () => {
  it("só avisa quando faltam produtos ou banners", () => {
    expect(buildExtractionWarning(makeSampleExtracted())).toBeNull();
    expect(buildExtractionWarning(makeSampleExtracted({ products: [], banners: [] }))).toBe(
      "Não conseguimos ler os produtos e banners desta loja; a proposta usa imagens de exemplo."
    );
    expect(buildExtractionWarning(makeSampleExtracted({ banners: [] }))).toContain("os banners");
  });
});

describe("POST /api/previews/generate com extração vazia", () => {
  it("emite evento warning e grava o aviso no preview", async () => {
    scraper.extractStoreFromUrl.mockResolvedValue(makeSampleExtracted({ products: [], banners: [] }));
    const res = await POST(
      new NextRequest("http://localhost/api/previews/generate", {
        method: "POST",
        body: JSON.stringify({ url: "https://loja.exemplo.com.br" }),
      })
    );
    const text = await res.text();
    expect(text).toContain("event: warning");
    expect(text).toContain("Não conseguimos ler os produtos e banners desta loja");
    expect(text).toContain("event: done");
    const saved = db.storePreview.update.mock.calls[0][0].data as { extractedData: { extractionWarnings: string[] } };
    expect(saved.extractedData.extractionWarnings).toHaveLength(1);
  });
});

describe("POST /api/previews/generate: etapa da captura mobile", () => {
  const generate = () =>
    POST(
      new NextRequest("http://localhost/api/previews/generate", {
        method: "POST",
        body: JSON.stringify({ url: "https://loja.exemplo.com.br" }),
      })
    );

  it("captura o mobile dentro do SSE e grava os caminhos", async () => {
    scraper.extractStoreFromUrl.mockResolvedValue(makeSampleExtracted());
    mobile.captureMobileStoreScreenshots.mockResolvedValue({
      mobileScreenshotPath: "/api/captures/m.png",
      mobileFullScreenshotPath: "/api/captures/m-full.jpg",
    });
    const text = await (await generate()).text();
    expect(text).toContain("event: done");
    const saved = db.storePreview.update.mock.calls[0][0].data as {
      extractedData: { mobileFullScreenshotPath?: string };
    };
    expect(saved.extractedData.mobileFullScreenshotPath).toBe("/api/captures/m-full.jpg");
  });

  it("falha na captura mobile não interrompe a geração", async () => {
    scraper.extractStoreFromUrl.mockResolvedValue(makeSampleExtracted());
    mobile.captureMobileStoreScreenshots.mockRejectedValue(new Error("chromium caiu"));
    const text = await (await generate()).text();
    expect(text).toContain("event: done");
    expect(text).not.toContain("event: error");
  });
});
