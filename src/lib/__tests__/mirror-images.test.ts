import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { APIRequestContext } from "playwright";
import { mirrorCriticalImages } from "@/lib/scraper/store-extractor";
import { makeSampleExtracted } from "./fixtures";

describe("mirrorCriticalImages", () => {
  it("não faz requisição (nem via Playwright) para URLs internas", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mirror-test-"));
    const get = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const store = makeSampleExtracted({
      logoUrl: "http://127.0.0.1/logo.png",
      banners: [{ imageUrl: "http://[::ffff:169.254.169.254]/x.jpg", slot: "hero" }],
      products: [],
      categories: [],
    });
    try {
      await mirrorCriticalImages(store, "https://loja.exemplo.com.br/", dir, "loja-abc123", {
        get,
      } as unknown as APIRequestContext);
      expect(get).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(store.logoUrl).toBe("http://127.0.0.1/logo.png");
    } finally {
      fetchSpy.mockRestore();
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("prioriza imagem primária dos produtos antes de images[1], reutiliza capturedImages e remove banner 404 quando há válido", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mirror-cache-"));
    const pngMagic = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(400, 1),
    ]);
    const jpgMagic = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(400, 2)]);

    const captured = new Map<string, { buf: Buffer; ct: string }>([
      ["https://cdn.exemplo.com/banner-ok.bin", { buf: pngMagic, ct: "application/octet-stream" }],
      ["https://cdn.exemplo.com/p1-main.jpg", { buf: jpgMagic, ct: "image/jpeg" }],
    ]);

    const requestedUrls: string[] = [];
    const pwMock = {
      get: vi.fn(async (u: string) => {
        requestedUrls.push(u);
        return {
          ok: () => false,
          status: () => 404,
          headers: () => ({}),
          body: async () => Buffer.alloc(0),
        };
      }),
    } as unknown as APIRequestContext;

    const store = makeSampleExtracted({
      banners: [
        { imageUrl: "https://cdn.exemplo.com/banner-ok.bin", slot: "hero" },
        { imageUrl: "https://cdn.exemplo.com/banner-broken.jpg", slot: "slim" },
      ],
      products: [
        {
          id: "p1",
          title: "Produto 1",
          price: 100,
          imageUrl: "https://cdn.exemplo.com/p1-main.jpg",
          images: ["https://cdn.exemplo.com/p1-main.jpg", "https://cdn.exemplo.com/p1-sec.jpg"],
          category: "Cat",
          categories: ["Cat"],
        },
      ],
      categories: [],
    });

    try {
      await mirrorCriticalImages(
        store,
        "https://loja.exemplo.com.br/",
        dir,
        "loja-cache123",
        pwMock,
        undefined,
        captured
      );

      // banner-ok.bin e p1-main.jpg vieram direto do capturedImages sem bater na rede
      expect(requestedUrls).not.toContain("https://cdn.exemplo.com/banner-ok.bin");
      expect(requestedUrls).not.toContain("https://cdn.exemplo.com/p1-main.jpg");
      // Detecção por magic bytes atribuiu .png para octet-stream
      expect(store.banners).toHaveLength(1);
      expect(store.banners[0]?.imageUrl).toMatch(/^\/api\/captures\/.*\.[a-z]+$/);
      expect(store.banners[0]?.imageUrl).toMatch(/\.png$/);
      expect(store.products[0]?.imageUrl).toMatch(/^\/api\/captures\/.*\.jpg$/);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
