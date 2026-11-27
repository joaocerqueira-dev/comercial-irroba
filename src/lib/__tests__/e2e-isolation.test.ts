import { describe, expect, it, vi } from "vitest";
import { chromiumLaunchOptions } from "@/lib/scraper/browser";
import { chromium, type Browser, type Frame, type Page } from "playwright";
import sharp from "sharp";
import { NextRequest } from "next/server";
import { buildHeuristicBlueprint } from "@/lib/ai/architect";
import { compileStorefrontDocument } from "@/lib/irroba-blocks/compiler";
import { PREVIEW_IFRAME_SANDBOX, RENDER_CSP } from "@/lib/security/preview-isolation";
import { makeSampleExtracted } from "./fixtures";

const repo = vi.hoisted(() => ({ getPreviewWithBlueprint: vi.fn() }));
vi.mock("@/lib/previews/repository", () => repo);

import { GET as renderGET } from "@/app/render/[slug]/route";

// Isolamento do preview: iframe sandbox sem allow-same-origin num Chromium real (sem rede).
let canLaunch = true;
try {
  const b = await chromium.launch(chromiumLaunchOptions());
  await b.close();
} catch {
  canLaunch = false;
}

const APP = "http://app.test";

/** Página "do app" com um iframe sandbox apontando para /render/x (servido com a CSP real). */
async function openParentWithRender(browser: Browser, html: string, extraFrames = "") {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const png = await sharp({
    create: { width: 4, height: 4, channels: 3, background: { r: 200, g: 0, b: 0 } },
  })
    .png()
    .toBuffer();
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (url === `${APP}/`) {
      return route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><body style="margin:0">
          <iframe id="f" sandbox="${PREVIEW_IFRAME_SANDBOX}" src="/render/x" style="width:1200px;height:700px"></iframe>
          ${extraFrames}
        </body>`,
      });
    }
    if (url === `${APP}/render/x`) {
      return route.fulfill({
        contentType: "text/html; charset=utf-8",
        headers: { "Content-Security-Policy": RENDER_CSP },
        body: html,
      });
    }
    if (url === `${APP}/api/captures/t.png`) {
      return route.fulfill({ contentType: "image/png", body: png });
    }
    if (url.startsWith("data:")) return route.continue();
    return route.abort();
  });
  await page.goto(`${APP}/`, { waitUntil: "load" });
  const frame = await waitForFrame(page, (f) => f.url().endsWith("/render/x"));
  await frame.waitForLoadState("load");
  return { page, frame, errors };
}

async function waitForFrame(page: Page, pred: (f: Frame) => boolean): Promise<Frame> {
  for (let i = 0; i < 100; i++) {
    const f = page.frames().find(pred);
    if (f) return f;
    await page.waitForTimeout(20);
  }
  throw new Error("frame não encontrado");
}

describe("GET /render/[slug]", () => {
  it("envia CSP restritiva com sandbox e frame-ancestors 'self'", async () => {
    const okResult = {
      status: "ok",
      preview: { legacyPublic: true, updatedAt: new Date("2026-11-26T12:00:00Z") },
      blueprint: buildHeuristicBlueprint(makeSampleExtracted()),
    };
    repo.getPreviewWithBlueprint.mockResolvedValueOnce(okResult);
    const res = await renderGET(new NextRequest(`${APP}/render/x`), {
      params: Promise.resolve({ slug: "x" }),
    });
    expect(res.status).toBe(200);
    // Mesma versão: revalidação responde 304 sem corpo
    const etag = res.headers.get("etag")!;
    expect(etag).toBeTruthy();
    repo.getPreviewWithBlueprint.mockResolvedValueOnce(okResult);
    const again = await renderGET(new NextRequest(`${APP}/render/x`, { headers: { "if-none-match": etag } }), {
      params: Promise.resolve({ slug: "x" }),
    });
    expect(again.status).toBe(304);
    const csp = res.headers.get("content-security-policy") ?? "";
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("script-src 'unsafe-inline'");
    // http: por compatibilidade com lojas antigas (resolveAssetUrl aceita http://)
    expect(csp).toContain("img-src 'self' https: http: data: blob:");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toMatch(/sandbox allow-scripts/);
    expect(csp).not.toContain("allow-same-origin");
  });

  it("404 também sai com a CSP", async () => {
    repo.getPreviewWithBlueprint.mockResolvedValueOnce({ status: "not_found" });
    const res = await renderGET(new NextRequest(`${APP}/render/y`), {
      params: Promise.resolve({ slug: "y" }),
    });
    expect(res.status).toBe(404);
    expect(res.headers.get("content-security-policy")).toBe(RENDER_CSP);
  });
});

describe.skipIf(!canLaunch)("E2E: isolamento do iframe de prévia", () => {
  it("o iframe sandbox não acessa parent.document nem cookies, e o runtime roda sem erros sob a CSP", async () => {
    const bp = buildHeuristicBlueprint(makeSampleExtracted());
    const browser = await chromium.launch(chromiumLaunchOptions());
    try {
      const { frame, errors } = await openParentWithRender(browser, compileStorefrontDocument(bp));

      const probe = await frame.evaluate(async () => {
        const out: Record<string, string> = {};
        try {
          void window.parent.document.body;
          out.parentDocument = "acessou";
        } catch (e) {
          out.parentDocument = (e as Error).name;
        }
        try {
          void document.cookie;
          out.cookie = "acessou";
        } catch (e) {
          out.cookie = (e as Error).name;
        }
        out.origin = window.origin;
        // img-src 'self' resolve para o host do app mesmo com origem opaca
        out.selfImg = await new Promise<string>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(String(img.naturalWidth));
          img.onerror = () => resolve("erro");
          img.src = "/api/captures/t.png";
        });
        return out;
      });
      expect(probe.parentDocument).toBe("SecurityError");
      expect(probe.cookie).toBe("SecurityError");
      expect(probe.origin).toBe("null");
      expect(probe.selfImg).toBe("4");

      // allow-forms: o submit (com preventDefault) do runtime continua disparando
      const btn = frame.locator('[data-irb-section="newsletter"] form button').first();
      expect(await btn.count()).toBe(1);
      await frame.locator('[data-irb-section="newsletter"] form input').first().fill("a@b.co");
      await btn.click();
      expect(await btn.textContent()).toContain("Cadastrado");
      expect(errors).toEqual([]);
    } finally {
      await browser.close();
    }
  }, 30_000);

  it("rolagem: o iframe avisa o pai (irroba-scroll) e obedece irroba-scroll-to", async () => {
    const bp = buildHeuristicBlueprint(makeSampleExtracted());
    const browser = await chromium.launch(chromiumLaunchOptions());
    try {
      const { page, frame } = await openParentWithRender(browser, compileStorefrontDocument(bp));
      await page.evaluate(() => {
        const w = window as unknown as { __msgs: unknown[] };
        w.__msgs = [];
        const f = document.getElementById("f") as HTMLIFrameElement;
        window.addEventListener("message", (e) => {
          if (e.source === f.contentWindow) w.__msgs.push({ data: e.data, origin: e.origin });
        });
      });

      await frame.evaluate(() => window.scrollTo(0, 600));
      await page.waitForFunction(() =>
        (window as unknown as { __msgs: Array<{ data: { type: string } }> }).__msgs.some(
          (m) => m.data.type === "irroba-scroll"
        )
      );
      const msg = await page.evaluate(
        () =>
          (window as unknown as { __msgs: Array<{ data: { type: string; ratio: number }; origin: string }> }).__msgs.find(
            (m) => m.data.type === "irroba-scroll"
          )!
      );
      expect(msg.origin).toBe("null");
      expect(msg.data.ratio).toBeGreaterThan(0);
      expect(msg.data.ratio).toBeLessThanOrEqual(1);

      await page.evaluate(() => {
        const f = document.getElementById("f") as HTMLIFrameElement;
        f.contentWindow!.postMessage({ type: "irroba-scroll-to", ratio: 0 }, "*");
      });
      await frame.waitForFunction(() => window.scrollY === 0);
      await page.evaluate(() => {
        const f = document.getElementById("f") as HTMLIFrameElement;
        f.contentWindow!.postMessage({ type: "irroba-scroll-to", ratio: 1 }, "*");
      });
      await frame.waitForFunction(() => window.scrollY > 600);
    } finally {
      await browser.close();
    }
  }, 30_000);

  it("o inspetor ignora comandos de outra janela e aceita os do pai (set-state após ready)", async () => {
    const bp = buildHeuristicBlueprint(makeSampleExtracted());
    const studioHtml = compileStorefrontDocument(bp, undefined, { studioInspector: true });
    const browser = await chromium.launch(chromiumLaunchOptions());
    try {
      // Um segundo iframe sandbox (ex.: conteúdo hostil) tenta comandar o inspetor do primeiro
      const attacker = `<iframe id="evil" sandbox="allow-scripts" srcdoc="<script>
          setInterval(function(){ try { parent.frames[0].postMessage({type:'irb-studio:set-mode',inspectMode:false},'*'); } catch(e){} }, 20);
        </script>"></iframe>`;
      const { page, frame } = await openParentWithRender(browser, studioHtml, attacker);
      await page.waitForTimeout(200);
      expect(await frame.evaluate(() => document.body.classList.contains("irb-inspect-mode"))).toBe(
        true
      );

      // O pai responde ao ready com set-state (modo, seleção e rolagem salvos)
      await page.evaluate(() => {
        const f = document.getElementById("f") as HTMLIFrameElement;
        f.contentWindow!.postMessage(
          {
            type: "irb-studio:set-state",
            inspectMode: false,
            activeSelection: null,
            scrollY: 400,
          },
          "*"
        );
      });
      await frame.waitForFunction(
        () => !document.body.classList.contains("irb-inspect-mode") && window.scrollY >= 399
      );
    } finally {
      await browser.close();
    }
  }, 30_000);

  it("o inspetor envia irb-studio:ready e irb-studio:state ao pai", async () => {
    const bp = buildHeuristicBlueprint(makeSampleExtracted());
    const studioHtml = compileStorefrontDocument(bp, undefined, { studioInspector: true });
    const browser = await chromium.launch(chromiumLaunchOptions());
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      await page.route("**/*", (r) => (r.request().url().startsWith("data:") ? r.continue() : r.abort()));
      await page.setContent(`<iframe id="f" sandbox="${PREVIEW_IFRAME_SANDBOX}" style="width:1200px;height:700px"></iframe>`);
      await page.evaluate((html) => {
        const w = window as unknown as { __types: string[] };
        w.__types = [];
        const f = document.getElementById("f") as HTMLIFrameElement;
        window.addEventListener("message", (e) => {
          if (e.source === f.contentWindow && e.data && typeof e.data.type === "string") {
            w.__types.push(e.data.type);
          }
        });
        f.srcdoc = html;
      }, studioHtml);
      await page.waitForFunction(() =>
        (window as unknown as { __types: string[] }).__types.includes("irb-studio:ready")
      );
      const frame = await waitForFrame(page, (f) => f !== page.mainFrame());
      await frame.evaluate(() => window.scrollTo(0, 300));
      await page.waitForFunction(() =>
        (window as unknown as { __types: string[] }).__types.includes("irb-studio:state")
      );
    } finally {
      await browser.close();
    }
  }, 30_000);
});
