import { describe, expect, it } from "vitest";
import { buildHeuristicBlueprint } from "@/lib/ai/architect";
import { contrastRatio } from "@/lib/ai/color-utils";
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

  it("renders LIME icon-only header with pop-up search modal, clean resizable benefits banner, and honors custom section layout order/visibility", () => {
    const bp = buildHeuristicBlueprint(makeSampleExtracted());
    bp.sections.benefitsBanner = {
      mode: "generated-art",
      backgroundColor: "#F4F4F5",
      textColor: "#111827",
      siteImageUrls: [],
      maxHeightPx: 92,
      maxWidthPx: 1080,
      paddingY: 8,
    };
    bp.sections.layout = [
      { id: "showcase1", label: "Vitrine Principal", irrobaModule: "Listas de Produtos", enabled: true },
      { id: "hero", label: "Banner Principal", irrobaModule: "Banner Versão 2", enabled: true },
      { id: "tarja", label: "Tarja de Benefícios", irrobaModule: "Tarja Informativa", enabled: true },
      { id: "newsletter", label: "Newsletter", irrobaModule: "Newsletter", enabled: false },
    ];
    const html = compileStorefrontDocument(bp);

    // LIME icon-only header + pop-up search modal
    expect(html).toContain('id="irb-toggle-search"');
    expect(html).toContain('id="irb-search-modal"');
    expect(html).toContain('role="dialog"');
    expect(html).not.toContain('<span class="headerActionLabel">Entrar</span>');
    expect(html).not.toContain('<span class="headerActionLabel">Sacola</span>');

    // Resizable benefits banner without top/bottom accent lines
    expect(html).toContain("max-height:92px");
    expect(html).toContain("max-width:1080px");
    expect(html).not.toContain(encodeURIComponent('height="3"'));

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

  it('renders single-word moodSectionTitle "Coleções" as "Explore Coleções" without "Coleções Exclusiva"', () => {
    const bp = buildHeuristicBlueprint(makeSampleExtracted());
    bp.sections.moodSectionTitle = "Coleções";
    const html = compileStorefrontDocument(bp);

    expect(html).not.toContain("Coleções Exclusiva");
    expect(html).toMatch(/Explore\s*<em[^>]*>Coleções<\/em>/);
  });

  it("renders apparel size grid (PP–GG) instead of shoe sizes (34–40) for clothing stores", () => {
    const bp = buildHeuristicBlueprint(
      makeSampleExtracted({
        storeName: "Ateliê Moda Vegana",
        description: "Roupas autorais e sustentáveis sem crueldade animal.",
        categories: [
          { label: "Blazers", href: "https://example.com/blazers" },
          { label: "Camisetas", href: "https://example.com/camisetas" },
          { label: "Vestidos", href: "https://example.com/vestidos" },
        ],
        products: [
          {
            id: "a1",
            title: "Blazer Alfaiataria Linho",
            price: 389.9,
            imageUrl: "https://cdn.example.com/blazer.jpg",
            images: ["https://cdn.example.com/blazer.jpg"],
            category: "Blazers",
            categories: ["Blazers"],
          },
          {
            id: "a2",
            title: "Camiseta Algodão Orgânico",
            price: 129.9,
            imageUrl: "https://cdn.example.com/camiseta.jpg",
            images: ["https://cdn.example.com/camiseta.jpg"],
            category: "Camisetas",
            categories: ["Camisetas"],
          },
          {
            id: "a3",
            title: "Vestido Midi Fluido",
            price: 279.9,
            imageUrl: "https://cdn.example.com/vestido.jpg",
            images: ["https://cdn.example.com/vestido.jpg"],
            category: "Vestidos",
            categories: ["Vestidos"],
          },
        ],
      })
    );

    const html = compileStorefrontDocument(bp);
    expect(html).toContain('data-size-opt="PP"');
    expect(html).toContain('data-size-opt="M"');
    expect(html).toContain('data-size-opt="G"');
    expect(html).not.toContain('data-size-opt="34"');
    expect(html).not.toContain('data-size-opt="40"');
  });

  it("includes mobile header CSS constraints in @media (max-width: 640px) so cart icon stays visible", () => {
    const bp = buildHeuristicBlueprint(makeSampleExtracted());
    const html = compileStorefrontDocument(bp);

    const mediaIdx = html.indexOf("@media (max-width: 640px)");
    expect(mediaIdx).toBeGreaterThan(-1);
    const mobileCssSlice = html.slice(mediaIdx, mediaIdx + 700);
    expect(mobileCssSlice).toContain("max-width: 128px");
    expect(mobileCssSlice).toContain("width: 34px");
  });

  it("auto-fixes dark foregrounds (#333333) on dark announcement and footer backgrounds for WCAG legibility", () => {
    const bp = buildHeuristicBlueprint(
      makeSampleExtracted({
        tokens: {
          bodyBackground: "#FFFFFF",
          bodyForeground: "#111827",
          primaryButtonBg: "#026526",
          announcementBackground: "#111827",
          announcementForeground: "#333333",
          footerBackground: "#141414",
          footerForeground: "#333333",
          headerIsOverlay: false,
        },
      })
    );

    expect(bp.visualOverrides.announcement.foreground).not.toBe("#333333");
    expect(
      contrastRatio(
        bp.visualOverrides.announcement.background,
        bp.visualOverrides.announcement.foreground
      )
    ).toBeGreaterThanOrEqual(4.5);

    expect(bp.theme.secondaryForeground).not.toBe("#333333");
    expect(bp.visualOverrides.footer.foreground).not.toBe("#333333");
    expect(
      contrastRatio(bp.visualOverrides.footer.background, bp.visualOverrides.footer.foreground)
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(
        bp.visualOverrides.footer.legalBackground,
        bp.visualOverrides.footer.legalForeground
      )
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("applies desktop single-line nav, editorial top contrast, compact 6-item tarja, Escape/backdrop modal close, and PDP reset", () => {
    const bp = buildHeuristicBlueprint(
      makeSampleExtracted({
        banners: [
          { imageUrl: "https://cdn.example.com/hero.jpg", slot: "hero" },
          ...Array.from({ length: 6 }, (_, i) => ({
            imageUrl: `https://cdn.example.com/benefit-${i + 1}.webp`,
            slot: "benefits" as const,
          })),
        ],
      })
    );

    const html = compileStorefrontDocument(bp);
    expect(html).toContain("flex-wrap: nowrap");
    expect(html).toContain(".headerContent_navInline::-webkit-scrollbar { display: none; }");
    expect(html).toContain("rgba(0,0,0,0.52) 0%,rgba(0,0,0,0.16) 24%");
    expect(html).toContain("background:rgba(0,0,0,0.3);padding:4px 9px;border-radius:999px;");
    expect(html).toContain("flex:1 1 120px;max-width:195px;");
    expect(html).toContain("gap:12px;");
    expect(html).toContain("accountModal.classList.remove('open')");
    expect(html).toContain("cartDrawer.classList.remove('open')");
    expect(html).toContain("mobileDrawer.classList.remove('open')");
    expect(html).toContain("if (e.target === accountModalEl) accountModalEl.classList.remove('open');");
    expect(html).toContain("document.querySelectorAll('.pdpSizeBtn')");
    expect(html).toContain("cepInput.value = ''");
  });
});

describe("XSS no documento compilado", () => {
  it("escapa texto do botão de compra dentro do <script>", () => {
    const bp = buildHeuristicBlueprint(makeSampleExtracted());
    bp.visualOverrides.pageProduct.buyButtonText = "</script><img src=x onerror=alert(1)>";
    const html = compileStorefrontDocument(bp);
    expect(html).not.toContain("</script><img src=x");
  });

  it("injeta o inspetor visual Irroba apenas quando studioInspector está ativo", () => {
    const bp = buildHeuristicBlueprint(makeSampleExtracted());
    const cleanHtml = compileStorefrontDocument(bp);
    const studioHtml = compileStorefrontDocument(bp, undefined, { studioInspector: true });

    expect(cleanHtml).not.toContain("irb-studio-inspector-js");
    expect(studioHtml).toContain("irb-studio-inspector-js");
    expect(studioHtml).toContain("irb-studio-hover-badge");
    expect(studioHtml).toContain("Clique para editar");
  });

  it("aplica posicionamento overlay/sticky, opacidade 100% transparente sem afetar logo, hover de links, tamanhos em PX nos banners, dropdown de conta e ticker na barra superior", () => {
    const bp = buildHeuristicBlueprint(makeSampleExtracted());
    bp.visualOverrides.header.position = "overlay";
    bp.visualOverrides.header.backgroundOpacity = 0;
    bp.visualOverrides.header.linkHoverColor = "#FF3366";
    bp.visualOverrides.header.linkHoverStyle = "pill";
    bp.visualOverrides.header.linkHoverBackground = "#FFE4EC";
    bp.visualOverrides.banner.heightPx = 620;
    bp.visualOverrides.banner.customWidthPx = 1140;
    if (bp.sections.slimBanner) {
      bp.sections.slimBanner.heightPx = 110;
      bp.sections.slimBanner.widthPx = 980;
    }
    bp.visualOverrides.announcement = {
      background: "#111827",
      foreground: "#FFFFFF",
      messages: ["Frete grátis acima de R$ 199", "5% OFF no PIX imediato"],
      rollingEnabled: true,
      intervalSeconds: 3,
      transitionMode: "slide-up",
    };

    const html = compileStorefrontDocument(bp);

    expect(html).toContain('class="irb-header header--overlay"');
    expect(html).toContain("background: rgba(255, 255, 255, 0);");
    const headerRuleMatch = html.match(/header\.irb-header\s*\{([^}]*)\}/);
    expect(headerRuleMatch?.[1]).toBeTruthy();
    expect(headerRuleMatch?.[1]).not.toContain("opacity:");
    expect(html).toContain("--header-link-hover-color: #FF3366;");
    expect(html).toContain("--header-link-hover-bg: #FFE4EC;");
    expect(html).toContain("height: 620px;");
    expect(html).toContain("max-width:1140px;");
    expect(html).toContain("min-height:110px;");
    expect(html).toContain("max-width:980px;");
    expect(html).toContain('id="irb-account-dropdown"');
    expect(html).toContain('id="irb-account-backdrop"');
    expect(html).toContain("<span>Entrar</span>");
    expect(html).toContain("<span>Criar conta</span>");
    expect(html).toContain('id="irb-overline-ticker"');
    expect(html).toContain('data-interval-ms="3000"');
    expect(html).toContain("Frete grátis acima de R$ 199");
    expect(html).toContain("5% OFF no PIX imediato");
  });
});
