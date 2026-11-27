import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware, isPublicPath } from "@/middleware";
import { resetRateLimits } from "@/lib/net/rate-limit";

const db = vi.hoisted(() => ({
  storePreview: { findUnique: vi.fn(), update: vi.fn(async () => ({})) },
}));
vi.mock("@/lib/db", () => ({ prisma: db }));

const shots = vi.hoisted(() => ({
  captureMobileStoreScreenshots: vi.fn(),
  getCachedMobileScreenshots: vi.fn(),
}));
vi.mock("@/lib/scraper/mobile-screenshot", () => shots);

import * as publicMobileRoute from "@/app/api/captures/mobile/[slug]/route";
import { POST as RECAPTURE } from "@/app/api/previews/[id]/mobile-capture/route";

const cached = {
  mobileScreenshotPath: "/api/captures/loja-abc-mobile.png",
  mobileFullScreenshotPath: "/api/captures/loja-abc-mobile-full.jpg",
};

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/captures/mobile/[slug] (público)", () => {
  const get = (slug: string) =>
    publicMobileRoute.GET(new NextRequest(`http://localhost/api/captures/mobile/${slug}`), {
      params: Promise.resolve({ slug }),
    });

  it("serve o cache sem disparar o navegador", async () => {
    shots.getCachedMobileScreenshots.mockResolvedValue(cached);
    const res = await get("loja-abc");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(cached);
    expect(shots.captureMobileStoreScreenshots).not.toHaveBeenCalled();
  });

  it("404 quando não há cache, sem captura nem consulta ao banco", async () => {
    shots.getCachedMobileScreenshots.mockResolvedValue(null);
    const res = await get("loja-abc");
    expect(res.status).toBe(404);
    expect(shots.captureMobileStoreScreenshots).not.toHaveBeenCalled();
    expect(db.storePreview.findUnique).not.toHaveBeenCalled();
  });

  it("400 para slug inválido", async () => {
    expect((await get("..%2Fetc")).status).toBe(400);
  });

  it("não existe mais POST público", () => {
    expect("POST" in publicMobileRoute).toBe(false);
  });
});

describe("POST /api/previews/[id]/mobile-capture (autenticado)", () => {
  const post = (id = "p1") =>
    RECAPTURE(new NextRequest(`http://localhost/api/previews/${id}/mobile-capture`, { method: "POST" }), {
      params: Promise.resolve({ id }),
    });

  it("recaptura com force e grava os caminhos no extractedData", async () => {
    db.storePreview.findUnique.mockResolvedValue({
      id: "p1",
      slug: "loja-abc",
      sourceUrl: "https://loja.com.br",
      extractedData: { storeName: "Loja" },
    });
    shots.captureMobileStoreScreenshots.mockResolvedValue(cached);
    const res = await post();
    expect(res.status).toBe(200);
    expect(shots.captureMobileStoreScreenshots).toHaveBeenCalledWith(
      "https://loja.com.br",
      "loja-abc",
      expect.objectContaining({ force: true })
    );
    expect(db.storePreview.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { extractedData: expect.objectContaining({ storeName: "Loja", ...cached }) },
      })
    );
  });

  it("404 para preview inexistente e 502 quando a captura falha", async () => {
    db.storePreview.findUnique.mockResolvedValueOnce(null);
    expect((await post()).status).toBe(404);
    db.storePreview.findUnique.mockResolvedValueOnce({ id: "p1", slug: "s", sourceUrl: "https://x.com", extractedData: null });
    shots.captureMobileStoreScreenshots.mockResolvedValueOnce(null);
    expect((await post()).status).toBe(502);
  });

  it("aplica rate limit (429 com Retry-After)", async () => {
    vi.stubEnv("RATE_LIMIT_PER_MIN", "1");
    db.storePreview.findUnique.mockResolvedValue(null);
    expect((await post()).status).toBe(404);
    const limited = await post();
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBeTruthy();
  });
});

describe("middleware", () => {
  it("rota de recaptura mobile não é pública e exige sessão", () => {
    expect(isPublicPath("/api/previews/abc/mobile-capture")).toBe(false);
    expect(isPublicPath("/api/captures/mobile/loja-abc")).toBe(true);
    const anon = middleware(
      new NextRequest("http://localhost/api/previews/abc/mobile-capture", { method: "POST" })
    );
    expect(anon.status).toBe(401);
    const authed = middleware(
      new NextRequest("http://localhost/api/previews/abc/mobile-capture", {
        method: "POST",
        headers: { cookie: "session=abc" },
      })
    );
    expect(authed.status).toBe(200);
    expect(authed.headers.get("x-middleware-next")).toBe("1");
  });
});
