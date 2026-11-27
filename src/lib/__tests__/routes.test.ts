import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { buildHeuristicBlueprint } from "@/lib/ai/architect";
import { makeSampleExtracted, withSession } from "./fixtures";

const db = vi.hoisted(() => ({
  storePreview: {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(async () => [] as unknown[]),
    deleteMany: vi.fn(async () => ({ count: 0 })),
  },
}));
vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/files/captures", async (orig) => ({
  ...(await orig<typeof import("@/lib/files/captures")>()),
  deletePreviewCaptures: vi.fn(async () => 0),
}));
const ai = vi.hoisted(() => ({ buildStoreBlueprint: vi.fn(), callGeminiWithTimeout: vi.fn() }));
vi.mock("@/lib/ai/architect", async (orig) => ({
  ...(await orig<typeof import("@/lib/ai/architect")>()),
  buildStoreBlueprint: ai.buildStoreBlueprint,
  callGeminiWithTimeout: ai.callGeminiWithTimeout,
}));

const providers = vi.hoisted(() => ({ getUserTextAi: vi.fn() }));
vi.mock("@/lib/ai/providers", () => providers);
const userAi = { provider: "openai", modelId: "gpt-x", model: {}, supportsImageInput: true };

// Sessão válida de admin (o guard roda antes de tudo; admin acessa qualquer proposta)
vi.mock("@/lib/auth/session", async (orig) => {
  const { TEST_USERS } = await import("./fixtures");
  return { ...(await orig<object>()), getUserFromToken: vi.fn(async () => TEST_USERS.admin) };
});

import { DELETE, PATCH } from "@/app/api/previews/[id]/route";
import { POST as REANALYZE } from "@/app/api/previews/[id]/reanalyze/route";
import { POST as AI_HTML } from "@/app/api/previews/[id]/ai-html/route";
import { resetRateLimits } from "@/lib/net/rate-limit";

const extracted = makeSampleExtracted();
const ctx = (id = "abc") => ({ params: Promise.resolve({ id }) });
const req = (body?: unknown) =>
  new NextRequest(
    "http://localhost/api/previews/abc",
    withSession({ method: "POST", body: body === undefined ? undefined : JSON.stringify(body) })
  );

beforeEach(() => {
  vi.clearAllMocks();
  providers.getUserTextAi.mockResolvedValue(userAi);
});

describe("PATCH /api/previews/[id]", () => {
  it("400 para blueprint inválido", async () => {
    const res = await PATCH(req({ blueprint: { foo: 1 } }), ctx());
    expect(res.status).toBe(400);
  });
  it("404 quando o preview não existe", async () => {
    db.storePreview.findUnique.mockResolvedValue(null);
    const bp = buildHeuristicBlueprint(extracted);
    const res = await PATCH(req({ blueprint: bp }), ctx());
    expect(res.status).toBe(404);
    expect(db.storePreview.update).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/previews/[id]", () => {
  it("404 quando não existe e 500 com erro real", async () => {
    db.storePreview.findUnique.mockResolvedValue({ ownerId: null });
    db.storePreview.delete.mockRejectedValueOnce(Object.assign(new Error("x"), { code: "P2025" }));
    expect((await DELETE(req(), ctx())).status).toBe(404);
    db.storePreview.delete.mockRejectedValueOnce(new Error("disco cheio"));
    const res = await DELETE(req(), ctx());
    expect(res.status).toBe(500);
    // Detalhe interno só no log; o cliente recebe mensagem genérica
    expect((await res.json()).error).toBe("Falha ao excluir preview");
  });
});

describe("POST reanalyze", () => {
  it("devolve o blueprint sem gravar", async () => {
    db.storePreview.findUnique.mockResolvedValue({ id: "abc", extractedData: extracted });
    const bp = buildHeuristicBlueprint(extracted);
    ai.buildStoreBlueprint.mockResolvedValue({ blueprint: bp, mode: "ai", modelUsed: "m" });
    const res = await REANALYZE(req(), ctx());
    expect(res.status).toBe(200);
    expect((await res.json()).blueprint.brand.name).toBe(bp.brand.name);
    expect(db.storePreview.update).not.toHaveBeenCalled();
  });
  it("400 sem IA configurada, sem chamar o architect", async () => {
    db.storePreview.findUnique.mockResolvedValue({ id: "abc", extractedData: extracted });
    providers.getUserTextAi.mockResolvedValueOnce(null);
    const res = await REANALYZE(req(), ctx());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Configure sua IA para gerar com IA");
    expect(ai.buildStoreBlueprint).not.toHaveBeenCalled();
  });
  it("admin reanalisando proposta de outro usa a IA do admin", async () => {
    const { TEST_USERS } = await import("./fixtures");
    db.storePreview.findUnique.mockResolvedValue({ id: "abc", ownerId: TEST_USERS.outro.id, extractedData: extracted });
    ai.buildStoreBlueprint.mockResolvedValue({ blueprint: buildHeuristicBlueprint(extracted), mode: "ai", modelUsed: "gpt-x" });
    const res = await REANALYZE(req(), ctx());
    expect(providers.getUserTextAi).toHaveBeenCalledWith(TEST_USERS.admin.id);
    expect(ai.buildStoreBlueprint.mock.calls[0][1]).toMatchObject({ ai: userAi });
    expect((await res.json()).mode).toBe("ai");
  });
  it("503 quando a IA não responde", async () => {
    db.storePreview.findUnique.mockResolvedValue({ id: "abc", extractedData: extracted });
    ai.buildStoreBlueprint.mockResolvedValue({ blueprint: {}, mode: "heuristic", aiError: "sem chave" });
    expect((await REANALYZE(req(), ctx())).status).toBe(503);
  });
});

describe("GET /api/previews", () => {
  it("só lista: não apaga previews presos nem arquivos", async () => {
    const files = await import("@/lib/files/captures");
    db.storePreview.findMany.mockResolvedValueOnce([{ id: "p1", slug: "loja-a", status: "ready", _count: { responses: 0 } }]);
    const { GET } = await import("@/app/api/previews/route");
    const res = await GET(new NextRequest("http://localhost/api/previews", withSession()));
    expect(res.status).toBe(200);
    expect((await res.json()).previews).toHaveLength(1);
    expect(db.storePreview.findMany).toHaveBeenCalledTimes(1);
    expect(db.storePreview.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: "ready" } }));
    expect(db.storePreview.deleteMany).not.toHaveBeenCalled();
    expect(db.storePreview.delete).not.toHaveBeenCalled();
    expect(files.deletePreviewCaptures).not.toHaveBeenCalled();
  });
});

describe("cleanupStalePreviews (boot e generate)", () => {
  it("remove arquivos dos previews presos em processing", async () => {
    const files = await import("@/lib/files/captures");
    const { cleanupStalePreviews } = await import("@/lib/previews/maintenance");
    db.storePreview.findMany
      .mockResolvedValueOnce([{ id: "old1", slug: "loja-x-aaaaaa" }]) // stale
      .mockResolvedValueOnce([]); // referências de outros previews
    expect(await cleanupStalePreviews()).toBe(1);
    expect(db.storePreview.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["old1"] } } });
    expect(files.deletePreviewCaptures).toHaveBeenCalledWith("loja-x-aaaaaa", "old1", expect.anything());
    // Referências: mesmo começo de slug (espelhos antigos) OU mesmo começo de id (ai-/up- antigos)
    expect(db.storePreview.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          OR: [{ slug: { startsWith: "loja-x-aaaaaa" } }, { id: { startsWith: "old1" } }],
          NOT: { id: "old1" },
        },
      })
    );
  });

  it("throttle: uma execução por janela, e nunca lança", async () => {
    const m = await import("@/lib/previews/maintenance");
    m.resetStaleCleanupThrottle();
    db.storePreview.findMany.mockRejectedValueOnce(new Error("db fora"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const t0 = 1_000_000_000;
    await expect(m.cleanupStalePreviewsThrottled(t0)).resolves.toBe(0);
    expect(db.storePreview.findMany).toHaveBeenCalledTimes(1);
    await m.cleanupStalePreviewsThrottled(t0 + 1000);
    expect(db.storePreview.findMany).toHaveBeenCalledTimes(1);
    await m.cleanupStalePreviewsThrottled(t0 + m.STALE_CLEANUP_THROTTLE_MS + 1);
    expect(db.storePreview.findMany).toHaveBeenCalledTimes(2);
    errSpy.mockRestore();
  });
});

describe("PATCH: limites e erros genéricos", () => {
  it("400 para imagem data: ou URL longa demais no blueprint", async () => {
    db.storePreview.findUnique.mockResolvedValue({ id: "abc" });
    const bp = buildHeuristicBlueprint(extracted);
    const withData = structuredClone(bp);
    withData.sections.hero.imageUrl = "data:image/png;base64,AAAA";
    expect((await PATCH(req({ blueprint: withData }), ctx())).status).toBe(400);
    const tooLong = structuredClone(bp);
    tooLong.brand.logoUrl = `https://cdn.exemplo.com/${"a".repeat(4100)}.png`;
    expect((await PATCH(req({ blueprint: tooLong }), ctx())).status).toBe(400);
    expect(db.storePreview.update).not.toHaveBeenCalled();
  });

  it("400 para WhatsApp acima de 32 caracteres", async () => {
    db.storePreview.findUnique.mockResolvedValue({ id: "abc" });
    const bp = buildHeuristicBlueprint(extracted);
    const res = await PATCH(req({ blueprint: bp, sellerWhatsapp: "1".repeat(33) }), ctx());
    expect(res.status).toBe(400);
  });

  it("500 com mensagem genérica quando o Prisma falha", async () => {
    db.storePreview.findUnique.mockResolvedValue({ id: "abc" });
    db.storePreview.update.mockRejectedValueOnce(new Error("SQLITE_BUSY: database is locked"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = await PATCH(req({ blueprint: buildHeuristicBlueprint(extracted) }), ctx());
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("SQLITE");
    errSpy.mockRestore();
  });

  it("aceita generationMode ai, gemini e heuristic; ignora outros", async () => {
    db.storePreview.findUnique.mockResolvedValue({ id: "abc" });
    db.storePreview.update.mockResolvedValue({ id: "abc" });
    const bp = buildHeuristicBlueprint(extracted);
    for (const mode of ["ai", "gemini", "heuristic", "x"]) {
      db.storePreview.update.mockClear();
      await PATCH(req({ blueprint: bp, generationMode: mode }), ctx());
      const data = db.storePreview.update.mock.calls[0][0].data as { generationMode?: string };
      expect(data.generationMode).toBe(mode === "x" ? undefined : mode);
    }
  });
});

describe("reanalyze: signal e erro genérico", () => {
  it("repassa um AbortSignal ao architect", async () => {
    db.storePreview.findUnique.mockResolvedValue({ id: "abc", extractedData: extracted });
    ai.buildStoreBlueprint.mockResolvedValue({ blueprint: buildHeuristicBlueprint(extracted), mode: "ai" });
    await REANALYZE(req(), ctx());
    const opts = ai.buildStoreBlueprint.mock.calls[0][1] as { signal?: AbortSignal };
    expect(opts.signal).toBeInstanceOf(AbortSignal);
  });

  it("exceção do architect vira 503 sem detalhe interno", async () => {
    db.storePreview.findUnique.mockResolvedValue({ id: "abc", extractedData: extracted });
    ai.buildStoreBlueprint.mockRejectedValueOnce(new Error("GoogleGenAI: API key AIza... invalid"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = await REANALYZE(req(), ctx());
    expect(res.status).toBe(503);
    expect(JSON.stringify(await res.json())).not.toContain("AIza");
    errSpy.mockRestore();
  });
});

describe("POST /api/previews/[id]/ai-html", () => {
  beforeEach(() => resetRateLimits());

  it("responde 400 quando o preview ainda não tem blueprint", async () => {
    db.storePreview.findUnique.mockResolvedValueOnce({
      id: "abc",
      slug: "loja-abc",
      sourceUrl: "https://loja.exemplo.com.br/",
      extractedData: extracted,
      blueprint: null,
    });
    const res = await AI_HTML(req({ prompt: "Crie 3 cards de benefícios" }), ctx());
    expect(res.status).toBe(400);
  });

  it("aplica rate limit (429) por usuário+IP", async () => {
    process.env.RATE_LIMIT_PER_MIN = "2";
    try {
      // Corpo inválido: barato, mas ainda consome o balde
      expect((await AI_HTML(req({ prompt: "ab" }), ctx())).status).toBe(400);
      expect((await AI_HTML(req({ prompt: "ab" }), ctx())).status).toBe(400);
      const limited = await AI_HTML(req({ prompt: "ab" }), ctx());
      expect(limited.status).toBe(429);
      expect(limited.headers.get("Retry-After")).toBeTruthy();
    } finally {
      delete process.env.RATE_LIMIT_PER_MIN;
    }
  });

  it("retorna 400 para corpo inválido e 404 quando preview não existe", async () => {
    const res400 = await AI_HTML(req({ prompt: "ab" }), ctx());
    expect(res400.status).toBe(400);

    db.storePreview.findUnique.mockResolvedValueOnce(null);
    const res404 = await AI_HTML(req({ prompt: "Crie 3 cards de benefícios" }), ctx());
    expect(res404.status).toBe(404);
  });

  it("retorna 503 sem GEMINI_API_KEY e 200 com HTML sanitizado quando Gemini responde", async () => {
    const bp = buildHeuristicBlueprint(extracted);
    const validRow = {
      id: "abc",
      slug: "loja-abc",
      sourceUrl: "https://loja.exemplo.com.br/",
      extractedData: extracted,
      blueprint: bp,
    };

    const origKey = process.env.GEMINI_API_KEY;
    try {
      delete process.env.GEMINI_API_KEY;
      db.storePreview.findUnique.mockResolvedValueOnce(validRow);
      const res503 = await AI_HTML(req({ prompt: "Crie um bloco institucional" }), ctx());
      expect(res503.status).toBe(503);

      process.env.GEMINI_API_KEY = "test-key";
      db.storePreview.findUnique.mockResolvedValueOnce(validRow);
      ai.callGeminiWithTimeout.mockResolvedValueOnce({
        text: JSON.stringify({
          html: '<div onclick="alert(1)" style="padding:16px;background:#fff;"><script>xss()</script><h3 style="margin:0;">Sobre Nós</h3></div>',
          summary: "Bloco institucional criado",
          suggestedTitle: "Sobre a Loja",
        }),
      });

      const res200 = await AI_HTML(req({ prompt: "Crie um bloco institucional" }), ctx());
      expect(res200.status).toBe(200);
      const json = await res200.json();
      expect(json.html).toContain("Sobre Nós");
      expect(json.html).not.toMatch(/<script|onclick/i);
      expect(json.summary).toBe("Bloco institucional criado");
      expect(json.suggestedTitle).toBe("Sobre a Loja");
    } finally {
      if (origKey !== undefined) process.env.GEMINI_API_KEY = origKey;
      else delete process.env.GEMINI_API_KEY;
    }
  });
});
