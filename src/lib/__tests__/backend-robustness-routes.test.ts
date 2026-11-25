import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { buildHeuristicBlueprint } from "@/lib/ai/architect";
import { makeSampleExtracted } from "./fixtures";

process.env.RATE_LIMIT_PER_MIN = "1000";

const db = vi.hoisted(() => ({
  storePreview: {
    create: vi.fn(async () => ({ id: "p1" })),
    findUnique: vi.fn(),
    findMany: vi.fn(async () => [] as unknown[]),
    update: vi.fn(),
    delete: vi.fn(async () => ({})),
    deleteMany: vi.fn(async () => ({ count: 0 })),
  },
}));
vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/files/captures", async (orig) => ({
  ...(await orig<typeof import("@/lib/files/captures")>()),
  deletePreviewCaptures: vi.fn(async () => 3),
}));
vi.mock("@/lib/net/safe-url", async (orig) => ({
  ...(await orig<typeof import("@/lib/net/safe-url")>()),
  assertPublicHttpUrl: vi.fn(async () => undefined),
}));
const scraper = vi.hoisted(() => ({ extractStoreFromUrl: vi.fn() }));
vi.mock("@/lib/scraper/store-extractor", () => scraper);
vi.mock("@/lib/scraper/mobile-screenshot", () => ({ captureMobileStoreScreenshots: vi.fn(async () => null) }));
const studio = vi.hoisted(() => ({
  buildImageRequestFromBlueprint: vi.fn((_bp: unknown, extra: Record<string, unknown>) => extra),
  processAiImageRequest: vi.fn(),
}));
vi.mock("@/lib/ai/image-studio", () => studio);

import { POST as GENERATE } from "@/app/api/previews/generate/route";
import { POST as AI_IMAGE } from "@/app/api/previews/[id]/ai-image/route";
import { POST as UPLOAD } from "@/app/api/previews/[id]/upload-image/route";
import { slugifyHostname, SLUG_HOST_MAX_LENGTH } from "@/lib/previews/slug";

const extracted = makeSampleExtracted();
const ctx = (id = "abc") => ({ params: Promise.resolve({ id }) });
const jsonReq = (url: string, body: unknown) =>
  new NextRequest(url, { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

describe("generate: limites de entrada", () => {
  it("400 para URL acima de 2048 caracteres", async () => {
    const res = await GENERATE(
      jsonReq("http://localhost/api/previews/generate", { url: `https://loja.com.br/${"a".repeat(2050)}` })
    );
    expect(res.status).toBe(400);
    expect(db.storePreview.create).not.toHaveBeenCalled();
  });

  it("400 para WhatsApp acima de 32 caracteres", async () => {
    const res = await GENERATE(
      jsonReq("http://localhost/api/previews/generate", { url: "https://loja.com.br", sellerWhatsapp: "9".repeat(33) })
    );
    expect(res.status).toBe(400);
  });

  it("slug limita o hostname a 60 caracteres e não termina em hífen", () => {
    const host = `${"a".repeat(59)}.${"b".repeat(60)}.com.br`;
    const slug = slugifyHostname(`https://www.${host}/`);
    const [base, suffix] = [slug.slice(0, -7), slug.slice(-6)];
    expect(base.length).toBeLessThanOrEqual(SLUG_HOST_MAX_LENGTH);
    expect(base).toBe("a".repeat(59));
    expect(suffix).toMatch(/^[0-9a-f]{6}$/);
    expect(slug).not.toContain("--");
    expect(slugifyHostname("https://loja.exemplo.com.br")).toMatch(/^loja-exemplo-com-br-[0-9a-f]{6}$/);
  });
});

describe("generate: falha limpa registro e arquivos", () => {
  it("apaga o preview e os arquivos gravados quando a extração falha", async () => {
    const files = await import("@/lib/files/captures");
    let slugSeen = "";
    scraper.extractStoreFromUrl.mockImplementation(async (_url: string, slug: string) => {
      slugSeen = slug;
      throw new Error("net::ERR_CONNECTION_RESET em 10.0.0.1 (stack interno)");
    });
    const res = await GENERATE(jsonReq("http://localhost/api/previews/generate", { url: "https://loja.exemplo.com.br" }));
    const text = await res.text();
    expect(text).toContain("event: error");
    expect(text).not.toContain("10.0.0.1");
    expect(db.storePreview.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
    expect(files.deletePreviewCaptures).toHaveBeenCalledWith(
      slugSeen,
      "p1",
      expect.objectContaining({ referencedElsewhere: expect.any(Set) })
    );
  });
});

describe("ai-image: blueprint validado e erros genéricos", () => {
  const bp = buildHeuristicBlueprint(extracted);

  it("404 quando o preview não existe", async () => {
    db.storePreview.findUnique.mockResolvedValue(null);
    const res = await AI_IMAGE(jsonReq("http://localhost/x", {}), ctx());
    expect(res.status).toBe(404);
  });

  it("400 quando o preview existe mas o blueprint ainda não foi gerado", async () => {
    db.storePreview.findUnique.mockResolvedValue({ id: "abc", sourceUrl: "https://a.com", blueprint: null });
    const res = await AI_IMAGE(jsonReq("http://localhost/x", {}), ctx());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Blueprint ainda não gerado");
    expect(studio.processAiImageRequest).not.toHaveBeenCalled();
  });

  it("409 quando o blueprint gravado não passa no schema", async () => {
    db.storePreview.findUnique.mockResolvedValue({ id: "abc", sourceUrl: "https://a.com", blueprint: { foo: 1 } });
    const res = await AI_IMAGE(jsonReq("http://localhost/x", {}), ctx());
    expect(res.status).toBe(409);
    expect(studio.processAiImageRequest).not.toHaveBeenCalled();
  });

  it("400 para slotLabel acima de 120 caracteres", async () => {
    db.storePreview.findUnique.mockResolvedValue({ id: "abc", sourceUrl: "https://a.com", blueprint: bp });
    const res = await AI_IMAGE(jsonReq("http://localhost/x", { slotLabel: "x".repeat(121) }), ctx());
    expect(res.status).toBe(400);
  });

  it("usa o blueprint validado e esconde o erro interno", async () => {
    db.storePreview.findUnique.mockResolvedValue({ id: "abc", sourceUrl: "https://a.com", blueprint: bp });
    studio.processAiImageRequest.mockRejectedValueOnce(new Error("[GoogleGenerativeAI Error] 500 key=AIzaSECRETA"));
    const res = await AI_IMAGE(jsonReq("http://localhost/x", { slotLabel: "Hero" }), ctx());
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("AIza");
    const passed = studio.buildImageRequestFromBlueprint.mock.calls[0][0] as typeof bp;
    expect(passed.brand.name).toBe(bp.brand.name);
  });
});

describe("upload-image: falha rápida por Content-Length", () => {
  it("413 antes de ler o corpo ou consultar o banco", async () => {
    const req = new NextRequest("http://localhost/api/previews/abc/upload-image", {
      method: "POST",
      body: "x",
      headers: { "content-length": String(20 * 1024 * 1024), "content-type": "multipart/form-data; boundary=x" },
    });
    const formData = vi.spyOn(req, "formData");
    const res = await UPLOAD(req, ctx());
    expect(res.status).toBe(413);
    expect(formData).not.toHaveBeenCalled();
    expect(db.storePreview.findUnique).not.toHaveBeenCalled();
  });
});
