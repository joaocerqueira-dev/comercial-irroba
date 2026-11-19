import { describe, expect, it } from "vitest";
import { buildHeuristicBlueprint } from "@/lib/ai/architect";
import {
  compileIrrobaExport,
  compileProductsCsv,
  compileStorefrontDocument,
} from "@/lib/irroba-blocks/compiler";
import type { ExtractedStoreData } from "@/lib/types/blueprint";

function makeSampleExtracted(overrides: Partial<ExtractedStoreData> = {}): ExtractedStoreData {
  return {
    sourceUrl: "https://estiloveggieshoes.com.br/",
    detectedPlatform: "Nuvemshop",
    storeName: "Estilo Veggie Shoes",
    description: "Calçados veganos feitos no Brasil sem crueldade animal.",
    logoUrl: "https://cdn.example.com/logo.png",
    tokens: {
      bodyBackground: "#FFFFFF",
      bodyForeground: "#111827",
      primaryButtonBg: "#026526",
      headerIsOverlay: false,
      headingFont: "Montserrat",
      bodyFont: "Poppins",
      borderRadiusPx: 8,
    },
    sectionHeadings: [],
    categories: [
      { label: "Botas", href: "https://estiloveggieshoes.com.br/botas" },
      { label: "Tênis", href: "https://estiloveggieshoes.com.br/tenis" },
    ],
    banners: [{ imageUrl: "https://cdn.example.com/hero.jpg", alt: "Coleção Vegana", slot: "hero" }],
    products: [
      {
        id: "p1",
        title: "Bota Vegana Classic",
        price: 299.9,
        compareAtPrice: 349.9,
        imageUrl: "https://cdn.example.com/bota.jpg",
        images: ["https://cdn.example.com/bota.jpg"],
        category: "Botas",
        categories: ["Botas"],
      },
      {
        id: "p2",
        title: "Tênis Ecológico Urban",
        price: 249.0,
        imageUrl: "https://cdn.example.com/tenis.jpg",
        images: ["https://cdn.example.com/tenis.jpg"],
        category: "Tênis",
        categories: ["Tênis"],
      },
    ],
    contacts: {
      whatsapp: "5511988887777",
      instagram: "https://instagram.com/estiloveggieshoes",
      email: "contato@estiloveggieshoes.com.br",
    },
    ...overrides,
  };
}

describe("Irroba LIME Compiler & Export", () => {
  it("compiles a complete standalone storefront document with LIME CSS variables", () => {
    const bp = buildHeuristicBlueprint(makeSampleExtracted());
    const html = compileStorefrontDocument(bp);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("--primary-background: #026526");
    expect(html).toContain("--title-font-family:");
    expect(html).toContain("Bota Vegana Classic");
    expect(html).toMatch(/R\$\s*299,90/);
    expect(html).toContain("theme-_lime");
    expect(html).toContain("Material+Symbols+Outlined");
    expect(html).toContain("irb-view-category");
    expect(html).toContain("irb-view-product");
    expect(html).not.toContain("🛒");
    expect(html).toContain("data:image/svg+xml");
  });

  it("uses extracted site-images for benefits banner when available", () => {
    const bp = buildHeuristicBlueprint(
      makeSampleExtracted({
        banners: [
          { imageUrl: "https://cdn.example.com/hero.jpg", slot: "hero" },
          { imageUrl: "https://cdn.example.com/benefit1.webp", slot: "benefits" },
          { imageUrl: "https://cdn.example.com/benefit2.webp", slot: "benefits" },
        ],
      })
    );
    expect(bp.sections.benefitsBanner?.mode).toBe("site-images");
    expect(bp.sections.benefitsBanner?.siteImageUrls).toEqual([
      "https://cdn.example.com/benefit1.webp",
      "https://cdn.example.com/benefit2.webp",
    ]);
    const html = compileStorefrontDocument(bp);
    expect(html).toContain("https://cdn.example.com/benefit1.webp");
  });

  it("sanitizes XSS payloads from scraped store names, product titles, and URLs", () => {
    const bp = buildHeuristicBlueprint(
      makeSampleExtracted({
        storeName: 'Loja <script>alert("xss")</script>',
        products: [
          {
            id: "xss-1",
            title: 'Sapato <img src=x onerror="alert(1)">',
            price: 150,
            imageUrl: "javascript:alert(1)",
            images: [],
            category: "<b>Teste</b>",
            categories: [],
          },
        ],
      })
    );

    const html = compileStorefrontDocument(bp);
    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).not.toContain('onerror="alert(1)"');
    expect(html).not.toContain("javascript:alert(1)");
    expect(html).toContain("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;");
  });

  it("separates native Irroba modules (Banners, Tarja, Product Lists) and reserves Conteúdo HTML for 2 editorial blocks", () => {
    const bp = buildHeuristicBlueprint(makeSampleExtracted());
    const exported = compileIrrobaExport(bp);

    expect(exported.limeSettings.length).toBeGreaterThanOrEqual(10);
    expect(exported.themeVisualChecklist.length).toBeGreaterThanOrEqual(6);
    expect(exported.bannerModulesChecklist.length).toBeGreaterThanOrEqual(1);
    expect(exported.bannerModulesChecklist[0]?.bannerType).toBe("Carrossel");
    expect(exported.bannerModulesChecklist[0]?.recommendedSize).toContain("1920");

    expect(exported.tarjaChecklist.moduleName).toContain("Tarja Informativa");
    expect(exported.tarjaChecklist.items.length).toBeGreaterThanOrEqual(1);
    expect(exported.productListsChecklist.length).toBeGreaterThanOrEqual(1);

    // Conteúdo HTML is strictly reserved for the 2 sophisticated editorial blocks
    expect(exported.htmlBlocks.length).toBe(2);
    expect(exported.htmlBlocks[0]?.id).toBe("irb-html-editorial-gallery");
    expect(exported.htmlBlocks[0]?.html).toContain('referrerpolicy="no-referrer"');
    expect(exported.htmlBlocks[0]?.html).toContain("100vw");
    expect(exported.htmlBlocks[1]?.id).toBe("irb-html-editorial-lookbook");
    expect(exported.htmlBlocks[1]?.html).toContain("100vw");

    for (const blk of exported.htmlBlocks) {
      expect(blk.html).toContain("style=");
      expect(blk.html.toLowerCase()).not.toContain("<style");
      expect(blk.html.toLowerCase()).not.toContain("<script");
    }
    expect(exported.customCss).toContain(".product.product-grid");
  });

  it("renders LIME icon-only header with collapsible search drawer and honors custom section layout order/visibility", () => {
    const bp = buildHeuristicBlueprint(makeSampleExtracted());
    bp.sections.layout = [
      { id: "showcase1", label: "Vitrine Principal", irrobaModule: "Listas de Produtos", enabled: true },
      { id: "hero", label: "Banner Principal", irrobaModule: "Banner Versão 2", enabled: true },
      { id: "newsletter", label: "Newsletter", irrobaModule: "Newsletter", enabled: false },
    ];
    const html = compileStorefrontDocument(bp);

    // LIME icon-only header + collapsible search drawer
    expect(html).toContain('id="irb-toggle-search"');
    expect(html).toContain('id="irb-search-drawer"');
    expect(html).not.toContain('<span class="headerActionLabel">Entrar</span>');
    expect(html).not.toContain('<span class="headerActionLabel">Sacola</span>');

    // Reordered sections: showcase1 appears before hero, and disabled newsletter is omitted
    const showcasePos = html.indexOf('data-irb-section="showcase1"');
    const heroPos = html.indexOf('data-irb-section="hero"');
    expect(showcasePos).toBeGreaterThan(-1);
    expect(heroPos).toBeGreaterThan(showcasePos);
    expect(html).not.toContain('data-irb-section="newsletter"');
  });

  it("preserves original client monochrome/cream palette without forcing green and emits designInsights", () => {
    const bp = buildHeuristicBlueprint(
      makeSampleExtracted({
        tokens: {
          bodyBackground: "#FFFFFF",
          bodyForeground: "#111111",
          surfaceBackground: "#F3EFE8",
          primaryButtonBg: "#000000",
          primaryButtonColor: "#FFFFFF",
          footerBackground: "#141414",
          footerForeground: "#FFFFFF",
          headerIsOverlay: false,
        },
      })
    );

    expect(bp.theme.primaryBackground).toBe("#000000");
    expect(bp.theme.neutralBackground).toBe("#F3EFE8");
    expect(bp.theme.secondaryBackground).toBe("#141414");
    expect(bp.designInsights.some((i) => i.severity === "suggestion")).toBe(true);
    expect(bp.sections.heroSlides[0]?.mode).toBe("artwork");
  });

  it("compiles products CSV with UTF-8 BOM and PT-BR decimal separator", () => {
    const bp = buildHeuristicBlueprint(makeSampleExtracted());
    const csv = compileProductsCsv(bp);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Bota Vegana Classic");
    expect(csv).toContain("299,90");
    expect(csv).toContain("349,90");
  });
});
