import { describe, expect, it } from "vitest";
import { chromium } from "playwright";
import { buildHeuristicBlueprint } from "@/lib/ai/architect";
import { compileStorefrontDocument } from "@/lib/irroba-blocks/compiler";
import { makeSampleExtracted } from "./fixtures";

const LAUNCH_OPTS = {
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
};

// Fumaça E2E: abre a vitrine compilada num Chromium real (sem rede) e checa erros de JS.
let canLaunch = true;
try {
  const b = await chromium.launch(LAUNCH_OPTS);
  await b.close();
} catch {
  canLaunch = false;
}

describe.skipIf(!canLaunch)("E2E: vitrine compilada", () => {
  it("carrega sem erros de script e com um único h1", async () => {
    const bp = buildHeuristicBlueprint(makeSampleExtracted());
    const html = compileStorefrontDocument(bp);
    const browser = await chromium.launch(LAUNCH_OPTS);
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
    const browser = await chromium.launch(LAUNCH_OPTS);
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

  it("mantém logo 100% opaca com navbar transparente em overlay, abre dropdown Entrar/Criar conta com blur e rola mensagens da barra superior", async () => {
    const bp = buildHeuristicBlueprint(makeSampleExtracted());
    bp.visualOverrides.header.position = "overlay";
    bp.visualOverrides.header.backgroundOpacity = 0;
    bp.visualOverrides.announcement = {
      background: "#111827",
      foreground: "#FFFFFF",
      messages: ["Mensagem 1", "Mensagem 2"],
      rollingEnabled: true,
      intervalSeconds: 1,
      transitionMode: "slide-up",
    };

    const html = compileStorefrontDocument(bp);
    const browser = await chromium.launch(LAUNCH_OPTS);
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      await page.route("**/*", (r) =>
        r.request().url().startsWith("data:") ? r.continue() : r.abort()
      );
      await page.setContent(html, { waitUntil: "domcontentloaded" });

      // 1) Navbar background 100% transparente sem reduzir opacidade da logo
      const styles = await page.evaluate(() => {
        const hdr = document.querySelector("header.irb-header")!;
        const logo = document.querySelector(".headerContent_logo")!;
        const hero = document.querySelector('[data-irb-section="hero"]')!;
        return {
          hdrBg: getComputedStyle(hdr).backgroundColor,
          hdrOpacity: getComputedStyle(hdr).opacity,
          logoOpacity: getComputedStyle(logo).opacity,
          hdrTop: hdr.getBoundingClientRect().top,
          heroTop: hero.getBoundingClientRect().top,
        };
      });
      expect(styles.hdrBg).toBe("rgba(255, 255, 255, 0)");
      expect(styles.hdrOpacity).toBe("1");
      expect(styles.logoOpacity).toBe("1");
      // Em modo overlay, o hero começa alinhado atrás do header
      expect(Math.abs(styles.heroTop - styles.hdrTop)).toBeLessThanOrEqual(2);

      // 2) Dropdown abaixo do ícone da conta com Entrar / Criar conta e blur no fundo
      await page.locator("#irb-open-account").click();
      expect(await page.locator("#irb-account-dropdown").isVisible()).toBe(true);
      expect(await page.locator("#irb-account-backdrop").isVisible()).toBe(true);
      expect(await page.locator("#irb-account-dropdown").textContent()).toContain("Entrar");
      expect(await page.locator("#irb-account-dropdown").textContent()).toContain("Criar conta");

      // 3) Barra de aviso rolando de Mensagem 1 para Mensagem 2 após 1s
      expect(
        await page.locator('.overlineModule__slide[data-overline-idx="0"]').evaluate((el) =>
          el.classList.contains("is-active")
        )
      ).toBe(true);
      await page.waitForTimeout(1150);
      expect(
        await page.locator('.overlineModule__slide[data-overline-idx="1"]').evaluate((el) =>
          el.classList.contains("is-active")
        )
      ).toBe(true);
    } finally {
      await browser.close();
    }
  }, 30_000);

  it("remove Início da navbar, desliza barra horizontalmente, filtra na lateral esquerda, exibe rodapé LIME e seleciona seção customizada no inspetor", async () => {
    const sample = makeSampleExtracted();
    const firstCatLabel = sample.categories[0]?.label || "Calçados";
    sample.products = [
      ...sample.products,
      {
        id: "p-full-price",
        title: "Cinto Preço Cheio",
        price: 150,
        imageUrl: "https://cdn.example.com/cinto.jpg",
        images: ["https://cdn.example.com/cinto.jpg"],
        category: firstCatLabel,
        categories: [firstCatLabel],
      },
      {
        id: "p-promo",
        title: "Bolsa Promo",
        price: 120,
        compareAtPrice: 200,
        imageUrl: "https://cdn.example.com/bolsa.jpg",
        images: ["https://cdn.example.com/bolsa.jpg"],
        category: firstCatLabel,
        categories: [firstCatLabel],
      },
    ];
    const bp = buildHeuristicBlueprint(sample);
    bp.visualOverrides.announcement.transitionMode = "slide-horizontal";
    bp.visualOverrides.announcement.intervalSeconds = 1;
    bp.visualOverrides.announcement.messages = ["Aviso A", "Aviso B"];
    bp.sections.customSections = [
      {
        id: "custom-html-e2e",
        kind: "html",
        title: "Seção Custom E2E",
        width: "container",
        html: '<div id="e2e-custom-box" style="padding:24px;">Conteúdo Custom E2E</div>',
      },
    ];
    bp.sections.layout = [
      { id: "hero", label: "Hero", irrobaModule: "Banner Versão 2", enabled: true },
      {
        id: "custom-html-e2e",
        label: "Seção Custom E2E",
        irrobaModule: "Conteúdo HTML",
        enabled: true,
        isCustom: true,
        customKind: "html",
      },
    ];

    const html = compileStorefrontDocument(bp, undefined, { studioInspector: true });
    const browser = await chromium.launch(LAUNCH_OPTS);
    try {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.route("**/*", (r) =>
        r.request().url().startsWith("data:") ? r.continue() : r.abort()
      );
      await page.setContent(html, { waitUntil: "domcontentloaded" });

      await page.evaluate(() => {
        (window as unknown as { __customMsgs: unknown[] }).__customMsgs = [];
        window.addEventListener("message", (e) => {
          if (e.data && e.data.type === "irb-studio:select") {
            (window as unknown as { __customMsgs: unknown[] }).__customMsgs.push(e.data);
          }
        });
      });

      // 1. Sem "Início" na navbar desktop e mobile drawer
      const desktopNavHasInicio = await page
        .locator(".headerContent_navInline, .headerContent_categories")
        .evaluateAll((els) =>
          els.some((el) =>
            Array.from(el.querySelectorAll("a, button")).some(
              (item) => (item.textContent || "").trim().toLowerCase() === "início"
            )
          )
        );
      expect(desktopNavHasInicio).toBe(false);

      const mobileNavHasInicio = await page.locator("#irb-mobile-drawer").evaluate((el) =>
        Array.from(el.querySelectorAll("a, button")).some(
          (item) => (item.textContent || "").trim().toLowerCase() === "início"
        )
      );
      expect(mobileNavHasInicio).toBe(false);

      // 2. Deslize horizontal da barra superior avança slide 0 -> slide 1
      await page.waitForTimeout(1150);
      expect(
        await page.locator('.overlineModule__slide[data-overline-idx="1"]').evaluate((el) =>
          el.classList.contains("is-active")
        )
      ).toBe(true);

      // 3. Inspetor seleciona seção customizada
      await page.locator('#e2e-custom-box').click();
      await page.waitForFunction(
        () =>
          ((window as unknown as { __customMsgs?: Array<unknown> }).__customMsgs?.length ?? 0) > 0,
        { timeout: 5000 }
      );
      const customMsgs = await page.evaluate(
        () => (window as unknown as { __customMsgs: Array<{ targetId?: string; customSectionId?: string }> }).__customMsgs
      );
      expect(customMsgs.some((m) => m.targetId === "custom-section" && m.customSectionId === "custom-html-e2e")).toBe(
        true
      );

      // 4. Rodapé LIME em 3 faixas
      expect(await page.locator(".footerContent--top").count()).toBe(1);
      expect(await page.locator(".footerContent--bottom").count()).toBe(1);
      expect(await page.locator(".footer-legal-info").count()).toBe(1);

      // 5. Muda para modo navegação, abre categoria com filtro lateral esquerdo, alterna 3/4 cols, testa mobile drawer e volta pelo logo
      await page.evaluate(() =>
        window.postMessage({ type: "irb-studio:set-mode", inspectMode: false }, "*")
      );
      await page.waitForTimeout(60);

      const firstNavLink = page.locator(".headerContent_navInline a, .headerContent_categories a").first();
      await firstNavLink.click();
      await page.waitForSelector("#irb-view-category.active", { timeout: 5000 });

      const sidebarBox = await page.locator("#irb-cat-sidebar").boundingBox();
      const mainBox = await page.locator("#mainContent").boundingBox();
      expect(sidebarBox).not.toBeNull();
      expect(mainBox).not.toBeNull();
      expect((sidebarBox?.width ?? 0) > 180).toBe(true);
      expect((sidebarBox?.x ?? 9999) < (mainBox?.x ?? 0)).toBe(true);

      await page.locator('.js-changeGrid[data-grid-cols="4"]').click();
      expect(
        await page.locator("#irb-cat-grid").evaluate((el) => el.classList.contains("grid-cols-4"))
      ).toBe(true);

      const beforeCount = parseInt((await page.locator("#irb-cat-count").textContent()) || "0", 10);

      await page.locator("#irb-filter-promo-only").check();
      await page.locator("#irb-apply-filters-btn").click();
      const promoCount = parseInt((await page.locator("#irb-cat-count").textContent()) || "0", 10);
      expect(promoCount).toBeGreaterThanOrEqual(1);
      expect(promoCount).toBeLessThan(beforeCount);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator("#irb-open-cat-filters").click();
      expect(
        await page.locator("#irb-cat-sidebar").evaluate((el) => el.classList.contains("open"))
      ).toBe(true);
      await page.locator("#irb-cat-filter-close").click();

      await page.locator("#irb-go-home-logo").click();
      expect(
        await page.locator("#irb-view-home").evaluate((el) => el.classList.contains("active"))
      ).toBe(true);
    } finally {
      await browser.close();
    }
  }, 30_000);
});
