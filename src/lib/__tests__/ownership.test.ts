import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { buildHeuristicBlueprint } from "@/lib/ai/architect";
import { makeSampleExtracted, TEST_USERS, withSession } from "./fixtures";

const db = vi.hoisted(() => ({
  storePreview: {
    findUnique: vi.fn(),
    findMany: vi.fn(async () => [] as unknown[]),
    create: vi.fn(async () => ({ id: "p1" })),
    update: vi.fn(async () => ({ id: "abc" })),
    delete: vi.fn(async () => ({ id: "abc", slug: "loja" })),
    deleteMany: vi.fn(async () => ({ count: 0 })),
  },
}));
vi.mock("@/lib/db", () => ({ prisma: db }));
const sess = vi.hoisted(() => ({ getUserFromToken: vi.fn() }));
vi.mock("@/lib/auth/session", async (orig) => ({ ...(await orig<object>()), ...sess }));
vi.mock("@/lib/files/captures", async (orig) => ({
  ...(await orig<typeof import("@/lib/files/captures")>()),
  deletePreviewCaptures: vi.fn(async () => 0),
}));
vi.mock("@/lib/net/safe-url", async (orig) => ({
  ...(await orig<typeof import("@/lib/net/safe-url")>()),
  assertPublicHttpUrl: vi.fn(async () => undefined),
}));
vi.mock("@/lib/scraper/store-extractor", () => ({
  extractStoreFromUrl: vi.fn(async () => {
    throw new Error("sem rede nos testes");
  }),
}));
vi.mock("@/lib/scraper/mobile-screenshot", () => ({ captureMobileStoreScreenshots: vi.fn(async () => null) }));
vi.mock("@/lib/ai/image-studio", () => ({
  buildImageRequestFromBlueprint: vi.fn(() => ({})),
  processAiImageRequest: vi.fn(async () => {
    throw new Error("sem IA nos testes");
  }),
}));
vi.mock("@/lib/ai/providers", () => ({ getUserTextAi: vi.fn(async () => null) }));
vi.mock("@/lib/ai/architect", async (orig) => ({
  ...(await orig<typeof import("@/lib/ai/architect")>()),
  buildStoreBlueprint: vi.fn(async () => ({ blueprint: {}, mode: "heuristic", aiError: "sem IA" })),
}));

import { GET as LIST } from "@/app/api/previews/route";
import { POST as GENERATE } from "@/app/api/previews/generate/route";
import { GET, PATCH, DELETE } from "@/app/api/previews/[id]/route";
import { POST as REANALYZE } from "@/app/api/previews/[id]/reanalyze/route";
import { POST as UPLOAD } from "@/app/api/previews/[id]/upload-image/route";
import { POST as MOBILE } from "@/app/api/previews/[id]/mobile-capture/route";
import { GET as CSV } from "@/app/api/previews/[id]/csv/route";
import { POST as AI_IMAGE } from "@/app/api/previews/[id]/ai-image/route";
import { POST as AI_HTML } from "@/app/api/previews/[id]/ai-html/route";
import { resetRateLimits } from "@/lib/net/rate-limit";

const extracted = makeSampleExtracted();
const blueprint = buildHeuristicBlueprint(extracted);
const row = (ownerId: string) => ({
  id: "abc",
  slug: "loja",
  sourceUrl: "https://loja.exemplo.com.br",
  ownerId,
  extractedData: extracted,
  blueprint,
  screenshotPath: null,
});
const ctx = { params: Promise.resolve({ id: "abc" }) };
const req = (body?: unknown, url = "http://localhost/api/previews/abc") =>
  new NextRequest(url, withSession({ method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }));

type Handler = (r: NextRequest, c: typeof ctx) => Promise<Response>;
const routes: [string, Handler, unknown][] = [
  ["GET [id]", GET, undefined],
  ["PATCH [id]", PATCH, { blueprint }],
  ["DELETE [id]", DELETE, undefined],
  ["reanalyze", REANALYZE, undefined],
  ["upload-image", UPLOAD, undefined],
  ["mobile-capture", MOBILE, undefined],
  ["csv", CSV, undefined],
  ["ai-image", AI_IMAGE, { prompt: "banner" }],
  ["ai-html", AI_HTML, { prompt: "um bloco" }],
];

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();
  delete process.env.GEMINI_API_KEY;
  sess.getUserFromToken.mockResolvedValue(TEST_USERS.comercial);
});

describe("rotas [id] respeitam o dono", () => {
  it.each(routes)("%s: 404 para proposta de outro usuário", async (_n, handler, body) => {
    db.storePreview.findUnique.mockResolvedValue(row(TEST_USERS.outro.id));
    const res = await handler(req(body), ctx);
    expect(res.status).toBe(404);
    expect(db.storePreview.update).not.toHaveBeenCalled();
    expect(db.storePreview.delete).not.toHaveBeenCalled();
  });

  it.each(routes)("%s: dono não recebe 404 nem 401", async (_n, handler, body) => {
    db.storePreview.findUnique.mockResolvedValue(row(TEST_USERS.comercial.id));
    const res = await handler(req(body), ctx);
    expect([401, 404]).not.toContain(res.status);
  });

  it.each(routes)("%s: 401 sem sessão válida", async (_n, handler, body) => {
    sess.getUserFromToken.mockResolvedValue(null);
    db.storePreview.findUnique.mockResolvedValue(row(TEST_USERS.comercial.id));
    const res = await handler(req(body), ctx);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/previews", () => {
  const list = (qs = "") => LIST(new NextRequest(`http://localhost/api/previews${qs}`, withSession()));
  const where = () => (db.storePreview.findMany.mock.calls[0] as unknown as [{ where: unknown }])[0].where;

  it("comercial vê só as próprias", async () => {
    await list();
    expect(where()).toEqual({ status: "ready", ownerId: TEST_USERS.comercial.id });
  });
  it("comercial com ?owner=x continua filtrado pelo próprio id", async () => {
    await list("?owner=x");
    expect(where()).toEqual({ status: "ready", ownerId: TEST_USERS.comercial.id });
  });
  it("admin sem owner vê todas; com ?owner=x filtra", async () => {
    sess.getUserFromToken.mockResolvedValue(TEST_USERS.admin);
    await list();
    expect(where()).toEqual({ status: "ready" });
    db.storePreview.findMany.mockClear();
    await list("?owner=x");
    expect(where()).toEqual({ status: "ready", ownerId: "x" });
  });
  it("401 sem sessão", async () => {
    sess.getUserFromToken.mockResolvedValue(null);
    expect((await list()).status).toBe(401);
  });
});

describe("POST /api/previews/generate", () => {
  it("grava ownerId do usuário logado", async () => {
    const res = await GENERATE(req({ url: "https://loja.exemplo.com.br" }, "http://localhost/api/previews/generate"));
    await res.text();
    expect(db.storePreview.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ownerId: TEST_USERS.comercial.id }) })
    );
  });
  it("401 sem sessão, antes de abrir o stream", async () => {
    sess.getUserFromToken.mockResolvedValue(null);
    const res = await GENERATE(req({ url: "https://loja.exemplo.com.br" }, "http://localhost/api/previews/generate"));
    expect(res.status).toBe(401);
    expect(db.storePreview.create).not.toHaveBeenCalled();
  });
});
