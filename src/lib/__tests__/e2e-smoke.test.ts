import { describe, expect, it } from "vitest";
import { chromium } from "playwright";
import { buildHeuristicBlueprint } from "@/lib/ai/architect";
import { compileStorefrontDocument } from "@/lib/irroba-blocks/compiler";
import { makeSampleExtracted } from "./fixtures";

// Fumaça E2E: abre a vitrine compilada num Chromium real (sem rede) e checa erros de JS.
let canLaunch = true;
try {
  const b = await chromium.launch({ headless: true });
  await b.close();
} catch {
  canLaunch = false;
}

describe.skipIf(!canLaunch)("E2E: vitrine compilada", () => {
  it("carrega sem erros de script e com um único h1", async () => {
    const bp = buildHeuristicBlueprint(makeSampleExtracted());
    const html = compileStorefrontDocument(bp);
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.route("**/*", (r) => (r.request().url().startsWith("data:") ? r.continue() : r.abort()));
      await page.setContent(html, { waitUntil: "domcontentloaded" });
      expect(errors).toEqual([]);
      expect(await page.locator("h1").count()).toBeLessThanOrEqual(1);
    } finally {
      await browser.close();
    }
  }, 30_000);

  it("exibe nome dos elementos no hover e dispara seleção ao clicar no modo Studio Irroba", async () => {
    const bp = buildHeuristicBlueprint(makeSampleExtracted());
    const studioHtml = compileStorefrontDocument(bp, undefined, { studioInspector: true });
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      await page.route("**/*", (r) =>
        r.request().url().startsWith("data:") ? r.continue() : r.abort()
      );
      await page.setContent(studioHtml, { waitUntil: "domcontentloaded" });

      await page.evaluate(() => {
        (window as unknown as { __selectedMsgs: unknown[] }).__selectedMsgs = [];
        window.addEventListener("message", (e) => {
          if (e.data && e.data.type === "irb-studio:select") {
            (window as unknown as { __selectedMsgs: unknown[] }).__selectedMsgs.push(e.data);
          }
        });
      });

      await page.locator(".overlineModule").hover();
      expect(await page.locator("#irb-studio-hover-title").textContent()).toContain(
        "Barra de Aviso"
      );

      await page.locator(".headerContent_logo").hover();
      expect(await page.locator("#irb-studio-hover-title").textContent()).toContain("Logotipo");

      await page.locator('[data-irb-section="hero"]').hover();
      expect(await page.locator("#irb-studio-hover-title").textContent()).toContain(
        "Banner Principal"
      );

      await page.locator(".headerContent_logo").click();
      await page.waitForTimeout(50);

      const msgs = await page.evaluate(
        () => (window as unknown as { __selectedMsgs: Array<{ targetId: string }> }).__selectedMsgs
      );
      expect(msgs.some((m) => m.targetId === "header-logo")).toBe(true);
    } finally {
      await browser.close();
    }
  }, 30_000);
});
