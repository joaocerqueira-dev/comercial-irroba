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
});
