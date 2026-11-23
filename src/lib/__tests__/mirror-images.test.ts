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
});
