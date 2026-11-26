import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { chromium } from "playwright";
import { chromiumLaunchOptions } from "@/lib/scraper/browser";

/**
 * SSRF por redirect no Chromium. O servidor local responde em 127.0.0.1, que o
 * validador real bloqueia. Para servir a página inicial, o teste troca só o validador:
 * `http://localhost:<porta>` é tratado como "público" e todo o resto (inclusive
 * `http://127.0.0.1:<porta>`, o alvo "interno") passa pelo validador de verdade.
 * Nenhum código de produção ganha gancho de teste.
 */
const allow = vi.hoisted(() => ({ origin: "" }));
vi.mock("@/lib/net/safe-url", async (orig) => {
  const real = await orig<typeof import("@/lib/net/safe-url")>();
  const isFake = (raw: string) => {
    try {
      return Boolean(allow.origin) && new URL(raw).origin === allow.origin;
    } catch {
      return false;
    }
  };
  return {
    ...real,
    assertPublicHttpUrl: async (raw: string) => (isFake(raw) ? new URL(raw) : real.assertPublicHttpUrl(raw)),
    isPublicHttpUrl: async (raw: string) => (isFake(raw) ? true : real.isPublicHttpUrl(raw)),
  };
});

import { assertNavigationChainPublic, gotoPublic, installSsrfGuard } from "@/lib/scraper/page-guard";
import { captureMobileStoreScreenshots } from "@/lib/scraper/mobile-screenshot";
import { getSharedBrowser } from "@/lib/scraper/browser";

let canLaunch = true;
try {
  const b = await chromium.launch(chromiumLaunchOptions());
  await b.close();
} catch {
  canLaunch = false;
}

const hits: string[] = [];
let server: http.Server;
let port = 0;
const internal = () => `http://127.0.0.1:${port}/interno`;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    hits.push(req.url ?? "");
    const send = (status: number, headers: Record<string, string>, body = "") => {
      res.writeHead(status, headers);
      res.end(body);
    };
    switch (req.url) {
      case "/direto":
        return send(302, { location: internal() });
      case "/salto1":
        return send(302, { location: "/salto2" });
      case "/salto2":
        return send(302, { location: internal() });
      case "/publico":
        return send(301, { location: "/final" });
      case "/final":
        return send(200, { "content-type": "text/html" }, "<h1>final</h1>");
      case "/com-iframe":
        return send(200, { "content-type": "text/html" }, '<h1>pai</h1><iframe src="/direto"></iframe>');
      default:
        return send(200, { "content-type": "text/html" }, "<h1>SEGREDO</h1>");
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  port = (server.address() as AddressInfo).port;
  allow.origin = `http://localhost:${port}`;
});

afterAll(async () => {
  if (canLaunch) await (await getSharedBrowser()).close().catch(() => undefined);
  await new Promise((r) => server.close(r));
});

beforeEach(() => {
  hits.length = 0;
});

const start = (p: string) => `http://localhost:${port}${p}`;

describe.skipIf(!canLaunch)("Playwright: redirect para IP interno", () => {
  const withPage = async <T>(fn: (page: import("playwright").Page) => Promise<T>) => {
    const context = await (await getSharedBrowser()).newContext();
    try {
      return await fn(await context.newPage());
    } finally {
      await context.close();
    }
  };

  it("sem o guard o Chromium seguiria o redirect (premissa do teste)", async () => {
    await withPage(async (page) => {
      // page.route sozinho não vê o salto: a navegação chega ao destino interno
      await page.route("**/*", (r) => r.continue());
      const res = await page.goto(start("/direto"));
      expect(hits).toContain("/interno");
      // ...e a checagem pós-goto da cadeia pega o salto
      await expect(assertNavigationChainPublic(page, res)).rejects.toThrow(/interno/i);
    });
  }, 30_000);

  it("bloqueia 302 direto para 127.0.0.1 sem tocar no destino", async () => {
    await withPage(async (page) => {
      await installSsrfGuard(page);
      await expect(gotoPublic(page, start("/direto"))).rejects.toThrow();
      expect(hits).toEqual(["/direto"]);
    });
  }, 30_000);

  it("bloqueia cadeia de redirects que termina na rede interna", async () => {
    await withPage(async (page) => {
      await installSsrfGuard(page);
      await expect(gotoPublic(page, start("/salto1"))).rejects.toThrow();
      expect(hits).toEqual(["/salto1", "/salto2"]);
    });
  }, 30_000);

  it("bloqueia redirect interno dentro de iframe", async () => {
    await withPage(async (page) => {
      await installSsrfGuard(page);
      await gotoPublic(page, start("/com-iframe"));
      await page.waitForTimeout(300);
      expect(hits).toContain("/direto");
      expect(hits).not.toContain("/interno");
    });
  }, 30_000);

  it("segue redirect público e mantém a URL final correta", async () => {
    await withPage(async (page) => {
      await installSsrfGuard(page);
      const res = await gotoPublic(page, start("/publico"));
      expect(res?.status()).toBe(200);
      expect(page.url()).toBe(start("/final"));
      expect(await page.textContent("h1")).toBe("final");
    });
  }, 30_000);

  it("captura mobile não segue redirect para IP interno", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "irroba-mobile-"));
    try {
      const out = await captureMobileStoreScreenshots(start("/direto"), "loja-ssrf", { capturesDir: dir });
      expect(out).toBeNull();
      expect(hits).not.toContain("/interno");
      expect(await fs.readdir(dir)).toEqual([]);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }, 30_000);
});
