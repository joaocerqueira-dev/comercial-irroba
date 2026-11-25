import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { buildHeuristicBlueprint } from "@/lib/ai/architect";
import { makeSampleExtracted } from "./fixtures";

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
const ai = vi.hoisted(() => ({ buildStoreBlueprint: vi.fn() }));
vi.mock("@/lib/ai/architect", async (orig) => ({
  ...(await orig<typeof import("@/lib/ai/architect")>()),
  buildStoreBlueprint: ai.buildStoreBlueprint,
}));

import { DELETE, PATCH } from "@/app/api/previews/[id]/route";
import { POST as REANALYZE } from "@/app/api/previews/[id]/reanalyze/route";

const extracted = makeSampleExtracted();
const ctx = (id = "abc") => ({ params: Promise.resolve({ id }) });
const req = (body?: unknown) =>
  new NextRequest("http://localhost/api/previews/abc", {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

beforeEach(() => vi.clearAllMocks());

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
    ai.buildStoreBlueprint.mockResolvedValue({ blueprint: bp, mode: "gemini", modelUsed: "m" });
    const res = await REANALYZE(req(), ctx());
    expect(res.status).toBe(200);
    expect((await res.json()).blueprint.brand.name).toBe(bp.brand.name);
    expect(db.storePreview.update).not.toHaveBeenCalled();
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
    db.storePreview.findMany.mockResolvedValueOnce([{ id: "p1", slug: "loja-a", status: "ready" }]);
    const { GET } = await import("@/app/api/previews/route");
    const res = await GET();
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
});

describe("reanalyze: signal e erro genérico", () => {
  it("repassa um AbortSignal ao architect", async () => {
    db.storePreview.findUnique.mockResolvedValue({ id: "abc", extractedData: extracted });
    ai.buildStoreBlueprint.mockResolvedValue({ blueprint: buildHeuristicBlueprint(extracted), mode: "gemini" });
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
