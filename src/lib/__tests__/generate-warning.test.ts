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

const providers = vi.hoisted(() => ({
  getUserTextAi: vi.fn(async () => null as unknown),
  getUserImageAi: vi.fn(async () => null as unknown),
}));
vi.mock("@/lib/ai/providers", () => providers);

// Sessão válida de admin (o guard roda antes de tudo; admin acessa qualquer proposta)
vi.mock("@/lib/auth/session", async (orig) => {
  const { TEST_USERS } = await import("./fixtures");
  return { ...(await orig<object>()), getUserFromToken: vi.fn(async () => TEST_USERS.admin) };
});

import { POST } from "@/app/api/previews/generate/route";
import { processAiImageRequest } from "@/lib/ai/image-studio";
import { buildHeuristicBlueprint, buildStoreBlueprint } from "@/lib/ai/architect";

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

  it("banner faltante: só gera com a IA de imagem de quem gera", async () => {
    const withoutHero = () => {
      const blueprint = buildHeuristicBlueprint(makeSampleExtracted({ products: [], banners: [] }));
      blueprint.sections.hero.imageUrl = "";
      return Promise.resolve({ blueprint, mode: "heuristic" as const });
    };
    const generate = async () =>
      (
        await POST(
          new NextRequest("http://localhost/api/previews/generate", {
            method: "POST",
            body: JSON.stringify({ url: "https://loja.exemplo.com.br" }),
          })
        )
      ).text();
    scraper.extractStoreFromUrl.mockResolvedValue(makeSampleExtracted({ products: [], banners: [] }));

    // sem IA de imagem: fallback atual, sem chamar o estúdio
    vi.mocked(buildStoreBlueprint).mockImplementationOnce(withoutHero);
    expect(await generate()).toContain("event: done");
    expect(providers.getUserImageAi).toHaveBeenCalledWith("u-admin");
    expect(processAiImageRequest).not.toHaveBeenCalled();

    const imageAi = { provider: "openai", modelId: "gpt-image-1.5", apiKey: "k" };
    providers.getUserImageAi.mockResolvedValueOnce(imageAi);
    vi.mocked(buildStoreBlueprint).mockImplementationOnce(withoutHero);
    expect(await generate()).toContain("event: done");
    expect(vi.mocked(processAiImageRequest).mock.calls[0][1]).toMatchObject({ imageAi, textAi: null });
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

describe("POST /api/previews/generate com a IA do usuário", () => {
  it("usa a IA de quem gera e grava generationMode, aiProvider e aiModel", async () => {
    const arch = await import("@/lib/ai/architect");
    const { TEST_USERS } = await import("./fixtures");
    const userAi = { provider: "anthropic", modelId: "claude-x", model: {}, supportsImageInput: true };
    providers.getUserTextAi.mockResolvedValueOnce(userAi);
    vi.mocked(arch.buildStoreBlueprint).mockImplementationOnce(async (data) => ({
      blueprint: arch.buildHeuristicBlueprint(data),
      mode: "ai",
      aiProvider: "anthropic",
      modelUsed: "claude-x",
    }));
    scraper.extractStoreFromUrl.mockResolvedValue(makeSampleExtracted());
    const text = await (
      await POST(
        new NextRequest("http://localhost/api/previews/generate", {
          method: "POST",
          body: JSON.stringify({ url: "https://loja.exemplo.com.br" }),
        })
      )
    ).text();
    expect(text).toContain("Analisando identidade visual com IA (anthropic)...");
    expect(text).not.toMatch(/Gemini/);
    expect(providers.getUserTextAi).toHaveBeenCalledWith(TEST_USERS.admin.id);
    expect(vi.mocked(arch.buildStoreBlueprint).mock.calls[0][1]).toMatchObject({ ai: userAi });
    expect(db.storePreview.update.mock.calls[0][0].data).toMatchObject({
      generationMode: "ai",
      aiProvider: "anthropic",
      aiModel: "claude-x",
    });
  });
});
