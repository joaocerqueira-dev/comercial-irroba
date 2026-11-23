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
    expect((await res.json()).error).toBe("disco cheio");
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
  it("remove arquivos dos previews presos em processing", async () => {
    const files = await import("@/lib/files/captures");
    db.storePreview.findMany
      .mockResolvedValueOnce([{ id: "old1", slug: "loja-x-aaaaaa" }]) // stale
      .mockResolvedValueOnce([]) // referências de outros previews
      .mockResolvedValueOnce([]); // listagem
    const { GET } = await import("@/app/api/previews/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(db.storePreview.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["old1"] } } });
    expect(files.deletePreviewCaptures).toHaveBeenCalledWith("loja-x-aaaaaa", "old1", expect.anything());
  });
});
