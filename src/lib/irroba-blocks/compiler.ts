import {
  escapeAttr,
  escapeCsvCell,
  escapeHtml,
  formatBrl,
  sanitizeCssColor,
  sanitizeFontName,
  sanitizeUrl,
} from "./sanitize";
import type { CompiledExport, HtmlBlockExport, StoreBlueprint } from "@/lib/types/blueprint";

const RADIUS_MAP: Record<StoreBlueprint["theme"]["radius"], { css: string; label: string }> = {
  none: { css: "0px", label: "Sem arredondamento" },
  small: { css: "6px", label: "Pequeno" },
  medium: { css: "12px", label: "Médio" },
  large: { css: "24px", label: "Grande" },
};

const HEADER_POSITION_LABELS: Record<StoreBlueprint["visualOverrides"]["header"]["position"], string> = {
  default: "Padrão",
  sticky: "Fixo ao rolar",
  overlay: "Fixo na tela (sobrepõe conteúdo)",
};

const BENEFIT_ICONS: Record<string, string> = {
  truck: "🚚",
  "credit-card": "💳",
  "shield-check": "🛡️",
  "refresh-cw": "🔄",
};

function buildMoodHtmlBlock(bp: StoreBlueprint): HtmlBlockExport {
  const radius = RADIUS_MAP[bp.theme.radius].css;
  const bodyColor = sanitizeCssColor(bp.theme.bodyForeground, "#111827");
  const activeMoods = (bp.sections.moodBanners ?? []).filter((m) => m.enabled);

  const items =
    activeMoods.length > 0
      ? activeMoods
      : bp.sections.categories.slice(0, 4).map((c, idx) => ({
          id: `cat-mood-${idx}`,
          title: c.label,
          subtitle: "Explorar",
          imageUrl: c.imageUrl || bp.sections.hero.imageUrl,
          href: c.href,
          enabled: true,
        }));

  const cardsHtml = items
    .slice(0, 4)
    .map((item) => {
      const title = escapeHtml(item.title);
      const subtitle = escapeHtml(item.subtitle || "Ver coleção");
      const imgUrl = sanitizeUrl(item.imageUrl, "");
      const href = escapeAttr(sanitizeUrl(item.href, "#vitrines"));
      return `<a href="${href}" data-irb-cat="${escapeAttr(item.title)}" style="position:relative;flex:1 1 220px;min-width:200px;height:280px;border-radius:${radius};overflow:hidden;display:block;text-decoration:none;background:#18181b;">
  <img src="${escapeAttr(imgUrl)}" alt="${title}" style="width:100%;height:100%;object-fit:cover;display:block;transition:transform .35s ease;" />
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 45%,rgba(0,0,0,0.72) 100%);"></div>
  <div style="position:absolute;left:18px;right:18px;bottom:18px;color:#ffffff;">
    <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;margin-bottom:4px;">${subtitle}</div>
    <div style="font-size:19px;font-weight:700;line-height:1.2;">${title}</div>
  </div>
</a>`;
    })
    .join("\n    ");

  const html = `<div style="padding:36px 0;box-sizing:border-box;">
  <h2 style="margin:0 0 22px 0;font-size:26px;font-weight:700;text-align:center;color:${bodyColor};">${escapeHtml(bp.sections.moodSectionTitle || "Explore por Categoria")}</h2>
  <div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;align-items:stretch;">
    ${cardsHtml}
  </div>
</div>`;

  return {
    id: "irb-html-mood",
    name: "Mosaico Visual de Categorias / Mood",
    moduleTitle: "Conteúdo HTML · Mood & Coleções",
    recommendedWidth: "Padrão do site (1280px)",
    placementNote: "Adicionar em Página Inicial > Topo do Conteúdo logo após os benefícios.",
    html,
  };
}

function buildBenefitsHtmlBlock(bp: StoreBlueprint): HtmlBlockExport {
  const neutralBg = sanitizeCssColor(bp.theme.neutralBackground, "#F4F4F5");
  const primary = sanitizeCssColor(bp.theme.primaryBackground, "#111827");
  const primaryFg = sanitizeCssColor(bp.theme.primaryForeground, "#FFFFFF");
  const bodyColor = sanitizeCssColor(bp.theme.bodyForeground, "#111827");
  const radius = RADIUS_MAP[bp.theme.radius].css;

  const itemsHtml = bp.sections.benefits
    .slice(0, 4)
    .map((b) => {
      const emoji = BENEFIT_ICONS[b.icon] ?? "✨";
      return `<div style="flex:1 1 220px;min-width:200px;display:flex;align-items:center;gap:14px;padding:14px 18px;background:#ffffff;border-radius:${radius};border:1px solid rgba(0,0,0,0.06);box-sizing:border-box;">
  <div style="width:42px;height:42px;flex-shrink:0;border-radius:${radius};background:${primary};color:${primaryFg};display:flex;align-items:center;justify-content:center;font-size:20px;">${emoji}</div>
  <div>
    <div style="font-size:14px;font-weight:700;color:${bodyColor};margin-bottom:2px;">${escapeHtml(b.title)}</div>
    <div style="font-size:12px;color:#4b5563;line-height:1.35;">${escapeHtml(b.subtitle)}</div>
  </div>
</div>`;
    })
    .join("\n      ");

  const html = `<div style="position:relative;left:50%;width:100vw;max-width:100vw;margin-left:-50vw;background:${neutralBg};padding:24px 20px;box-sizing:border-box;">
  <div style="max-width:1280px;margin:0 auto;display:flex;flex-wrap:wrap;gap:14px;justify-content:space-between;">
      ${itemsHtml}
  </div>
</div>`;

  return {
    id: "irb-html-benefits",
    name: "Régua de Benefícios & Confiança",
    moduleTitle: "Conteúdo HTML · Benefícios",
    recommendedWidth: "Largura Total",
    placementNote: "Usa breakout 100vw da Irroba para faixa de fundo inteira.",
    html,
  };
}

function buildSlimBannerHtmlBlock(bp: StoreBlueprint): HtmlBlockExport {
  const slim = bp.sections.slimBanner;
  const bg = sanitizeCssColor(slim?.backgroundColor ?? bp.theme.secondaryBackground, "#111827");
  const fg = sanitizeCssColor(slim?.textColor ?? bp.theme.secondaryForeground, "#FFFFFF");
  const btnBg = sanitizeCssColor(bp.theme.btnPrimaryBackground, "#FFFFFF");
  const btnFg = sanitizeCssColor(bp.theme.btnPrimaryColor, "#111827");
  const radius = RADIUS_MAP[bp.theme.radius].css;

  const html =
    slim?.mode === "image" && slim.imageUrl
      ? `<div style="padding:10px 0;">
  <a href="#vitrines" style="display:block;border-radius:${radius};overflow:hidden;">
    <img src="${escapeAttr(sanitizeUrl(slim.imageUrl, ""))}" alt="${escapeAttr(slim.headline)}" style="width:100%;height:auto;display:block;object-fit:cover;" />
  </a>
</div>`
      : `<div style="position:relative;left:50%;width:100vw;max-width:100vw;margin-left:-50vw;background:${bg};color:${fg};padding:18px 20px;box-sizing:border-box;">
  <div style="max-width:1280px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;">
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;">
      <span style="background:${btnBg};color:${btnFg};font-size:11px;font-weight:800;letter-spacing:0.08em;padding:5px 10px;border-radius:${radius};">${escapeHtml(slim?.badgeText || "OFERTA")}</span>
      <span style="font-size:16px;font-weight:600;">${escapeHtml(slim?.headline || bp.sections.announcementText)}</span>
    </div>
    <a href="#vitrines" style="display:inline-block;padding:10px 20px;border:1px solid ${fg};color:${fg};text-decoration:none;font-size:13px;font-weight:700;border-radius:${radius};">${escapeHtml(slim?.ctaText || "Aproveitar")}</a>
  </div>
</div>`;

  return {
    id: "irb-html-slim",
    name: "Banner Slim Promocional",
    moduleTitle: "Conteúdo HTML · Banner Slim",
    recommendedWidth: slim?.mode === "image" ? "Padrão do site (1280px)" : "Largura Total",
    placementNote: "Faixa horizontal de alto impacto acima da primeira vitrine.",
    html,
  };
}

function buildBrandStoryHtmlBlock(bp: StoreBlueprint): HtmlBlockExport {
  const secondaryBg = sanitizeCssColor(bp.theme.secondaryBackground, "#18181B");
  const secondaryFg = sanitizeCssColor(bp.theme.secondaryForeground, "#FFFFFF");
  const btnBg = sanitizeCssColor(bp.theme.btnPrimaryBackground, "#111827");
  const btnFg = sanitizeCssColor(bp.theme.btnPrimaryColor, "#FFFFFF");
  const btnBorder = sanitizeCssColor(bp.theme.btnPrimaryBorder, "transparent");
  const radius = RADIUS_MAP[bp.theme.radius].css;

  const html = `<div style="position:relative;left:50%;width:100vw;max-width:100vw;margin-left:-50vw;background:${secondaryBg};color:${secondaryFg};padding:48px 20px;box-sizing:border-box;">
  <div style="max-width:1080px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:24px;">
    <div style="flex:1 1 460px;">
      <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.8;margin-bottom:8px;">Sobre a ${escapeHtml(bp.brand.name)}</div>
      <h2 style="margin:0 0 12px 0;font-size:28px;font-weight:700;line-height:1.2;color:${secondaryFg};">${escapeHtml(bp.sections.promoStripText)}</h2>
      <p style="margin:0;font-size:15px;line-height:1.6;opacity:0.9;">${escapeHtml(bp.footer.aboutText)}</p>
    </div>
    <div style="flex:0 0 auto;">
      <a href="#vitrines" style="display:inline-block;padding:14px 28px;background:${btnBg};color:${btnFg};border:1px solid ${btnBorder};text-decoration:none;font-weight:700;font-size:14px;border-radius:${radius};">${escapeHtml(bp.sections.hero.ctaText)}</a>
    </div>
  </div>
</div>`;

  return {
    id: "irb-html-story",
    name: "Bloco Institucional / Diferenciais",
    moduleTitle: "Conteúdo HTML · História da Marca",
    recommendedWidth: "Largura Total",
    placementNote: "Ideal entre as vitrines ou antes dos depoimentos.",
    html,
  };
}

export function compileIrrobaExport(bp: StoreBlueprint): CompiledExport {
  const radiusInfo = RADIUS_MAP[bp.theme.radius];
  const htmlBlocks = [
    buildBenefitsHtmlBlock(bp),
    buildMoodHtmlBlock(bp),
    buildSlimBannerHtmlBlock(bp),
    buildBrandStoryHtmlBlock(bp),
  ];

  const limeSettings: CompiledExport["limeSettings"] = [
    { section: "Tema Base", field: "Layout Base", value: "LIME (Código 940001)" },
    { section: "Paleta de cores", field: "Cor primária", value: bp.theme.primaryBackground },
    { section: "Paleta de cores", field: "Texto sobre a cor primária", value: bp.theme.primaryForeground },
    { section: "Paleta de cores", field: "Cor secundária", value: bp.theme.secondaryBackground },
    { section: "Paleta de cores", field: "Texto sobre a cor secundária", value: bp.theme.secondaryForeground },
    { section: "Paleta de cores", field: "Cor neutra", value: bp.theme.neutralBackground },
    { section: "Paleta de cores", field: "Texto sobre a cor neutra", value: bp.theme.neutralForeground },
    { section: "Paleta de cores", field: "Fundo padrão", value: bp.theme.bodyBackground },
    { section: "Paleta de cores", field: "Texto sobre o fundo padrão", value: bp.theme.bodyForeground },
    { section: "Fonte", field: "Fonte dos Títulos", value: bp.theme.headingFont },
    { section: "Fonte", field: "Fonte do Corpo", value: bp.theme.bodyFont },
    { section: "Arredondamento", field: "Estilo", value: radiusInfo.label },
    {
      section: "Botões",
      field: "Botão Primário (Fundo / Texto)",
      value: `${bp.theme.btnPrimaryBackground} / ${bp.theme.btnPrimaryColor}`,
    },
    {
      section: "Botões",
      field: "Botão Secundário (Fundo / Texto / Outline)",
      value: `${bp.theme.btnSecondaryBackground} / ${bp.theme.btnSecondaryColor} / ${
        bp.theme.btnSecondaryOutline ? "Outline Sim" : "Sólido"
      }`,
    },
    { section: "Cabeçalho", field: "Estrutura", value: bp.theme.headerLayout.toUpperCase() },
  ];

  const themeVisualChecklist: CompiledExport["themeVisualChecklist"] = [
    {
      section: "Tarja Informativa (#overlineEditor)",
      controls: [
        { label: "Cor de fundo", value: bp.visualOverrides.announcement.background },
        { label: "Cor do texto", value: bp.visualOverrides.announcement.foreground },
      ],
    },
    {
      section: "Cabeçalho (#headerEditor)",
      controls: [
        { label: "Posicionamento", value: HEADER_POSITION_LABELS[bp.visualOverrides.header.position] },
        { label: "Cor de fundo / texto", value: `${bp.visualOverrides.header.background} / ${bp.visualOverrides.header.foreground}` },
        { label: "Opacidade de fundo", value: String(bp.visualOverrides.header.backgroundOpacity) },
        { label: "Desfoque (blur)", value: `${bp.visualOverrides.header.blurPx}px` },
        { label: "Formato texto categorias", value: bp.visualOverrides.header.categoryCase },
      ],
    },
    {
      section: "Banner (#banner_v2Editor)",
      controls: [
        {
          label: "Largura",
          value: bp.visualOverrides.banner.width === "full" ? "Largura Total" : "Padrão do site (1280px)",
        },
      ],
    },
    {
      section: "Lista de Produtos (#productListEditor)",
      controls: [
        {
          label: "Largura da lista",
          value: bp.visualOverrides.productCard.listWidth === "full" ? "Largura Total" : "Padrão do site (1280px)",
        },
        { label: "Alinhamento do título", value: bp.visualOverrides.productCard.titleAlign },
        { label: "Espaçamento horizontal card", value: `${bp.visualOverrides.productCard.paddingX}px` },
        {
          label: "Botão Comprar (Fundo / Texto)",
          value: `${bp.visualOverrides.productCard.buyBtnBackground} / ${bp.visualOverrides.productCard.buyBtnForeground}`,
        },
      ],
    },
    {
      section: "Rodapé (#footerInformationEditor & #footerLegalEditor)",
      controls: [
        {
          label: "Largura informações",
          value: bp.visualOverrides.footer.width === "full" ? "Largura Total" : "Padrão do site (1280px)",
        },
        {
          label: "Rodapé (Fundo / Texto)",
          value: `${bp.visualOverrides.footer.background} / ${bp.visualOverrides.footer.foreground}`,
        },
        {
          label: "Faixa legal (Fundo / Texto)",
          value: `${bp.visualOverrides.footer.legalBackground} / ${bp.visualOverrides.footer.legalForeground}`,
        },
      ],
    },
    {
      section: "Descrição do Produto (#pageProductEditor)",
      controls: [
        {
          label: "Orientação da galeria",
          value: bp.visualOverrides.pageProduct.galleryOrientation === "vertical" ? "Vertical" : "Horizontal",
        },
        { label: "Título do botão de compra", value: bp.visualOverrides.pageProduct.buyButtonText },
      ],
    },
  ];

  const bannerModulesChecklist: CompiledExport["bannerModulesChecklist"] = [
    ...(bp.sections.heroSlides ?? [])
      .filter((s) => s.enabled)
      .map((s, idx) => ({
        slotName: `Banner Principal — Slide ${idx + 1}`,
        moduleType: "Personalizar Loja > Banners (Banner Versão 2)",
        imageUrl: s.imageUrl,
        notes:
          s.mode === "artwork"
            ? "Arte original pronta (subir imagem direto no carrossel sem texto sobreposto)."
            : `Modo editorial — Título: "${s.headline}" | CTA: "${s.ctaText}"`,
      })),
    ...(bp.sections.secondaryBanner?.enabled && bp.sections.secondaryBanner.imageUrl
      ? [
          {
            slotName: "Banner Secundário de Campanha",
            moduleType: "Personalizar Loja > Banners (Banner Versão 2)",
            imageUrl: bp.sections.secondaryBanner.imageUrl,
            notes:
              bp.sections.secondaryBanner.mode === "artwork"
                ? "Posicionar entre a 1ª e 2ª Lista de Produtos em Topo do Conteúdo."
                : `Banner editorial: "${bp.sections.secondaryBanner.headline}"`,
          },
        ]
      : []),
  ];

  const customCss = `/* CSS Personalizado — Tema LIME (${bp.brand.name}) */
/* Cole em: Editar tema > Código > CSS Personalizado */
.product.product-grid {
  transition: transform 0.22s ease, box-shadow 0.22s ease;
  border-radius: ${radiusInfo.css};
}
.product.product-grid:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
}
.product-btn {
  font-weight: 600;
  letter-spacing: 0.02em;
  border-radius: ${radiusInfo.css};
  border: 1px solid ${sanitizeCssColor(bp.visualOverrides.productCard.buyBtnBorder, "transparent")};
}
.htmlContent a:hover img {
  transform: scale(1.04);
}`;

  return {
    limeSettings,
    themeVisualChecklist,
    bannerModulesChecklist,
    htmlBlocks,
    customCss,
  };
}

export function compileProductsCsv(bp: StoreBlueprint): string {
  const header = ["Nome", "Categoria", "Preço", "Preço Promocional", "URL da Imagem", "Parcelamento", "Descrição"];
  const rows = bp.products
    .filter((p) => p.visible !== false)
    .map((p) => [
      escapeCsvCell(p.title),
      escapeCsvCell(p.category),
      escapeCsvCell(p.price.toFixed(2).replace(".", ",")),
      escapeCsvCell(p.compareAtPrice ? p.compareAtPrice.toFixed(2).replace(".", ",") : ""),
      escapeCsvCell(sanitizeUrl(p.imageUrl, "")),
      escapeCsvCell(p.installmentsText ?? ""),
      escapeCsvCell(p.description ?? ""),
    ]);
  return "\uFEFF" + [header.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
}

export function compileStorefrontDocument(bp: StoreBlueprint): string {
  const primaryBg = sanitizeCssColor(bp.theme.primaryBackground, "#111827");
  const primaryFg = sanitizeCssColor(bp.theme.primaryForeground, "#FFFFFF");
  const secondaryBg = sanitizeCssColor(bp.theme.secondaryBackground, "#18181B");
  const secondaryFg = sanitizeCssColor(bp.theme.secondaryForeground, "#FFFFFF");
  const neutralBg = sanitizeCssColor(bp.theme.neutralBackground, "#F4F4F5");
  const neutralFg = sanitizeCssColor(bp.theme.neutralForeground, "#111827");
  const bodyBg = sanitizeCssColor(bp.theme.bodyBackground, "#FFFFFF");
  const bodyFg = sanitizeCssColor(bp.theme.bodyForeground, "#111827");

  const btnPrimaryBg = sanitizeCssColor(bp.theme.btnPrimaryBackground, primaryBg);
  const btnPrimaryFg = sanitizeCssColor(bp.theme.btnPrimaryColor, primaryFg);
  const btnPrimaryBorder = sanitizeCssColor(bp.theme.btnPrimaryBorder, "transparent");
  const btnSecBg = sanitizeCssColor(bp.theme.btnSecondaryBackground, "#111827");
  const btnSecFg = sanitizeCssColor(bp.theme.btnSecondaryColor, "#FFFFFF");
  const btnSecBorder = sanitizeCssColor(bp.theme.btnSecondaryBorder, primaryBg);

  const announcementBg = sanitizeCssColor(bp.visualOverrides.announcement?.background, "#111827");
  const announcementFg = sanitizeCssColor(bp.visualOverrides.announcement?.foreground, "#FFFFFF");
  const headerBg = sanitizeCssColor(bp.visualOverrides.header.background, bodyBg);
  const headerFg = sanitizeCssColor(bp.visualOverrides.header.foreground, bodyFg);

  const headingFont = sanitizeFontName(bp.theme.headingFont, "Montserrat");
  const bodyFont = sanitizeFontName(bp.theme.bodyFont, "Poppins");
  const radiusCss = RADIUS_MAP[bp.theme.radius].css;

  const cardBg = sanitizeCssColor(bp.visualOverrides.productCard.cardBackground, "#FFFFFF");
  const cardPaddingX = bp.visualOverrides.productCard.paddingX;
  const buyBg = sanitizeCssColor(bp.visualOverrides.productCard.buyBtnBackground, btnPrimaryBg);
  const buyFg = sanitizeCssColor(bp.visualOverrides.productCard.buyBtnForeground, btnPrimaryFg);
  const buyBorder = sanitizeCssColor(bp.visualOverrides.productCard.buyBtnBorder, "transparent");
  const priceColor = sanitizeCssColor(bp.visualOverrides.productCard.priceColor, bodyFg);
  const oldPriceColor = sanitizeCssColor(bp.visualOverrides.productCard.oldPriceColor, "#9CA3AF");

  const footerBg = sanitizeCssColor(bp.visualOverrides.footer.background, secondaryBg);
  const footerFg = sanitizeCssColor(bp.visualOverrides.footer.foreground, secondaryFg);
  const legalBg = sanitizeCssColor(bp.visualOverrides.footer.legalBackground, "#090D16");
  const legalFg = sanitizeCssColor(bp.visualOverrides.footer.legalForeground, "#FFFFFF");

  const exportPkg = compileIrrobaExport(bp);
  const benefitsBlock = exportPkg.htmlBlocks[0];
  const moodBlock = exportPkg.htmlBlocks[1];
  const slimBlock = exportPkg.htmlBlocks[2];
  const storyBlock = exportPkg.htmlBlocks[3];

  const visibleProducts = bp.products.filter((p) => p.visible !== false);
  const productMap = new Map(visibleProducts.map((p) => [p.id, p]));

  const renderShowcase = (showcase: StoreBlueprint["sections"]["showcases"][number], index: number) => {
    const items = showcase.productIds
      .map((id) => productMap.get(id))
      .filter((p): p is StoreBlueprint["products"][number] => Boolean(p));
    const list = items.length > 0 ? items : visibleProducts.slice(0, 8);
    if (list.length === 0) return "";

    const cards = list
      .map((p) => {
        const discountPct =
          p.compareAtPrice && p.compareAtPrice > p.price
            ? Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100)
            : 0;
        return `<article class="product product-grid" data-product-id="${escapeAttr(p.id)}" data-title="${escapeAttr(p.title.toLowerCase())}" data-category="${escapeAttr(p.category.toLowerCase())}">
  <div class="product-image-wrap" data-open-pdp="${escapeAttr(p.id)}">
    ${discountPct > 0 ? `<span class="product-badge">-${discountPct}%</span>` : ""}
    <img src="${escapeAttr(sanitizeUrl(p.imageUrl, ""))}" alt="${escapeAttr(p.title)}" loading="lazy" />
  </div>
  <div class="product-info">
    <span class="product-cat">${escapeHtml(p.category)}</span>
    <h3 class="product-title" data-open-pdp="${escapeAttr(p.id)}">${escapeHtml(p.title)}</h3>
    <div class="product-price-wrap">
      ${p.compareAtPrice && p.compareAtPrice > p.price ? `<span class="product-price-old">${formatBrl(p.compareAtPrice)}</span>` : ""}
      <span class="product-price">${formatBrl(p.price)}</span>
    </div>
    ${p.installmentsText ? `<div class="product-installments">${escapeHtml(p.installmentsText)}</div>` : ""}
    <button type="button" class="product-btn" data-add-cart="${escapeAttr(p.id)}">${escapeHtml(bp.visualOverrides.pageProduct.buyButtonText)}</button>
  </div>
</article>`;
      })
      .join("\n");

    return `<section class="productList" id="showcase-${index + 1}">
  <div class="${bp.visualOverrides.productCard.listWidth === "full" ? "container-full" : "container"}">
    <div class="productList__header" style="text-align:${bp.visualOverrides.productCard.titleAlign}">
      <h2 class="productList__title">${escapeHtml(showcase.title)}</h2>
      ${showcase.subtitle ? `<p class="productList__subtitle">${escapeHtml(showcase.subtitle)}</p>` : ""}
    </div>
    <div class="productList__grid">${cards}</div>
  </div>
</section>`;
  };

  const firstShowcaseHtml = bp.sections.showcases[0]
    ? renderShowcase(bp.sections.showcases[0], 0)
    : "";
  const extraShowcasesHtml = bp.sections.showcases
    .slice(1)
    .map((sc, idx) => renderShowcase(sc, idx + 1))
    .join("\n");

  const activeSlides = (bp.sections.heroSlides ?? []).filter((s) => s.enabled);
  const slidesToRender =
    activeSlides.length > 0
      ? activeSlides
      : [
          {
            id: "slide-fallback",
            imageUrl: bp.sections.hero.imageUrl,
            headline: bp.sections.hero.headline,
            subheadline: bp.sections.hero.subheadline,
            ctaText: bp.sections.hero.ctaText,
            ctaHref: "#vitrines",
            mode: "editorial" as const,
            enabled: true,
          },
        ];

  const heroSlidesHtml = slidesToRender
    .map((slide, idx) => {
      const imgUrl = escapeAttr(sanitizeUrl(slide.imageUrl, ""));
      if (slide.mode === "artwork") {
        return `<div class="heroSlide ${idx === 0 ? "active" : ""}" data-slide-idx="${idx}">
  <a href="${escapeAttr(sanitizeUrl(slide.ctaHref, "#vitrines"))}" class="heroSlide__artLink">
    <img class="heroSlide__artImg" src="${imgUrl}" alt="${escapeAttr(slide.headline)}" />
  </a>
</div>`;
      }
      return `<div class="heroSlide ${idx === 0 ? "active" : ""}" data-slide-idx="${idx}">
  <div class="bannerHero">
    <img class="bannerHero__img" src="${imgUrl}" alt="${escapeAttr(slide.headline)}" />
    <div class="bannerHero__overlay"></div>
    <div class="bannerHero__content">
      <span class="bannerHero__tag">${escapeHtml(bp.brand.niche)}</span>
      <h1 class="bannerHero__title">${escapeHtml(slide.headline)}</h1>
      <p class="bannerHero__subtitle">${escapeHtml(slide.subheadline)}</p>
      <a href="${escapeAttr(sanitizeUrl(slide.ctaHref, "#vitrines"))}" class="bannerHero__cta">${escapeHtml(slide.ctaText)}</a>
    </div>
  </div>
</div>`;
    })
    .join("\n");

  const secondaryBanner = bp.sections.secondaryBanner;
  const secondaryBannerHtml =
    secondaryBanner?.enabled && secondaryBanner.imageUrl
      ? secondaryBanner.mode === "artwork"
        ? `<section class="secondaryBannerSection">
  <div class="${bp.visualOverrides.banner.width === "container" ? "container" : ""}">
    <a href="#vitrines" style="display:block;">
      <img src="${escapeAttr(sanitizeUrl(secondaryBanner.imageUrl, ""))}" alt="${escapeAttr(secondaryBanner.headline)}" style="width:100%;height:auto;max-height:460px;object-fit:cover;display:block;border-radius:${bp.visualOverrides.banner.width === "container" ? radiusCss : "0px"};" />
    </a>
  </div>
</section>`
        : `<section class="secondaryBannerSection" style="padding:18px 0;">
  <div class="container">
    <div class="secondaryEditorial" style="background:${sanitizeCssColor(secondaryBanner.backgroundColor, secondaryBg)};color:${sanitizeCssColor(secondaryBanner.textColor, secondaryFg)};">
      <div class="secondaryEditorial__text">
        <span style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;opacity:0.75;">Campanha Especial</span>
        <h2 style="margin:8px 0 10px;font-size:clamp(24px,3vw,34px);line-height:1.15;">${escapeHtml(secondaryBanner.headline)}</h2>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.55;opacity:0.9;">${escapeHtml(secondaryBanner.subheadline)}</p>
        <a href="#vitrines" class="btnSecondaryCustom">${escapeHtml(secondaryBanner.ctaText)}</a>
      </div>
      <div class="secondaryEditorial__media">
        <img src="${escapeAttr(sanitizeUrl(secondaryBanner.imageUrl, ""))}" alt="${escapeAttr(secondaryBanner.headline)}" />
      </div>
    </div>
  </div>
</section>`
      : "";

  const testimonialsHtml = bp.sections.testimonials
    .map(
      (t) => `<div class="reviewCard">
  <div class="reviewCard__stars">${"★".repeat(Math.round(t.rating))}</div>
  <p class="reviewCard__text">"${escapeHtml(t.comment)}"</p>
  <div class="reviewCard__author">— ${escapeHtml(t.author)}</div>
</div>`
    )
    .join("\n");

  const fontsParam = Array.from(new Set([headingFont, bodyFont]))
    .map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700`)
    .join("&");

  const headerPosClass =
    bp.visualOverrides.header.position === "sticky" || bp.visualOverrides.header.position === "overlay"
      ? "header--sticky"
      : "";

  const logoHtml = bp.brand.logoUrl
    ? `<img src="${escapeAttr(sanitizeUrl(bp.brand.logoUrl))}" alt="${escapeAttr(bp.brand.name)}" class="headerContent_logo_img" />`
    : `<span class="headerContent_logo_text">${escapeHtml(bp.brand.name)}</span>`;

  const navLinksHtml = bp.sections.categories
    .slice(0, 8)
    .map(
      (c) =>
        `<a href="#vitrines" class="categoryLink" data-filter-cat="${escapeAttr(c.label.toLowerCase())}">${escapeHtml(c.label)}</a>`
    )
    .join("");

  const sanitizedProducts = visibleProducts.map((p) => ({
    ...p,
    imageUrl: sanitizeUrl(p.imageUrl, ""),
  }));
  const safeProductsJson = JSON.stringify(sanitizedProducts).replaceAll("</", "<\\/");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(bp.brand.name)} — Preview Irroba LIME</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?${fontsParam}&display=swap" rel="stylesheet" />
  <style>
    :root {
      --primary-background: ${primaryBg};
      --primary-foreground: ${primaryFg};
      --secondary-background: ${secondaryBg};
      --secondary-foreground: ${secondaryFg};
      --neutral-background: ${neutralBg};
      --neutral-foreground: ${neutralFg};
      --body-background: ${bodyBg};
      --body-foreground: ${bodyFg};
      --btn-primary-background: ${btnPrimaryBg};
      --btn-primary-color: ${btnPrimaryFg};
      --btn-primary-border: ${btnPrimaryBorder};
      --btn-secondary-background: ${btnSecBg};
      --btn-secondary-color: ${btnSecFg};
      --btn-secondary-border: ${btnSecBorder};
      --announcement-background: ${announcementBg};
      --announcement-foreground: ${announcementFg};
      --header-background: ${headerBg};
      --header-foreground: ${headerFg};
      --title-font-family: '${headingFont}', sans-serif;
      --text-font-family: '${bodyFont}', sans-serif;
      --irb-radius: ${radiusCss};
      --productGrid-background: ${cardBg};
      --productGrid-information-padding-x: ${cardPaddingX}px;
      --productList-buy-btn-background: ${buyBg};
      --productList-buy-btn-foreground: ${buyFg};
      --productList-buy-btn-border: ${buyBorder};
      --product-price-color: ${priceColor};
      --product-old-price-color: ${oldPriceColor};
      --footer-background: ${footerBg};
      --footer-foreground: ${footerFg};
      --footerLegal-background: ${legalBg};
      --footerLegal-foreground: ${legalFg};
    }

    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: var(--body-background);
      color: var(--body-foreground);
      font-family: var(--text-font-family);
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }
    h1, h2, h3, h4 { font-family: var(--title-font-family); }
    .container { max-width: 1280px; margin: 0 auto; padding: 0 20px; }
    .container-full { width: 100%; padding: 0 24px; }

    /* Tarja Informativa (.overlineModule) */
    .overlineModule {
      background: var(--announcement-background);
      color: var(--announcement-foreground);
      font-size: 12px;
      font-weight: 600;
      text-align: center;
      padding: 8px 16px;
      letter-spacing: 0.03em;
    }

    /* Cabeçalho (.headerContent) */
    header.irb-header {
      background: var(--header-background);
      color: var(--header-foreground);
      opacity: ${bp.visualOverrides.header.backgroundOpacity};
      backdrop-filter: blur(${bp.visualOverrides.header.blurPx}px);
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      z-index: 40;
      width: 100%;
    }
    header.header--sticky { position: sticky; top: 0; }
    .headerContent {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 14px 0;
      flex-wrap: wrap;
    }
    .headerContent--layout-2 { flex-direction: column; gap: 12px; }
    .headerContent_logo { display: flex; align-items: center; text-decoration: none; }
    .headerContent_logo_img { max-height: 50px; max-width: 200px; object-fit: contain; }
    .headerContent_logo_text {
      font-family: var(--title-font-family);
      font-size: 24px;
      font-weight: 700;
      color: var(--header-foreground);
    }
    .headerContent_search { flex: 1 1 260px; max-width: 440px; position: relative; }
    .headerContent_search input {
      width: 100%;
      padding: 10px 14px;
      border-radius: var(--irb-radius);
      border: 1px solid #d1d5db;
      font-family: var(--text-font-family);
      font-size: 14px;
      outline: none;
      background: #fff;
      color: #111827;
    }
    .headerContent_search input:focus { border-color: var(--primary-background); }
    .headerContent_actions { display: flex; align-items: center; gap: 12px; }
    .headerCartBtn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--btn-primary-background);
      color: var(--btn-primary-color);
      border: 1px solid var(--btn-primary-border);
      padding: 10px 16px;
      border-radius: var(--irb-radius);
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
    }
    .headerContent_categories {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 20px;
      padding: 10px 0 14px;
      border-top: 1px solid rgba(0, 0, 0, 0.06);
    }
    .categoryLink {
      text-decoration: none;
      color: var(--header-foreground);
      font-size: 13px;
      font-weight: 600;
      text-transform: ${bp.visualOverrides.header.categoryCase};
      letter-spacing: 0.04em;
      transition: color .15s;
    }
    .categoryLink:hover, .categoryLink.active { color: var(--primary-background); text-decoration: underline; }

    /* Carrossel Hero (.bannerModule) */
    .bannerModule { position: relative; width: 100%; overflow: hidden; }
    .heroSlide { display: none; width: 100%; }
    .heroSlide.active { display: block; }
    .heroSlide__artLink { display: block; width: 100%; }
    .heroSlide__artImg {
      width: 100%;
      height: auto;
      max-height: 540px;
      object-fit: cover;
      display: block;
      border-radius: ${bp.visualOverrides.banner.width === "container" ? "var(--irb-radius)" : "0px"};
    }
    .heroNavBtn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 10;
      width: 40px;
      height: 40px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.4);
      background: rgba(17,24,39,0.55);
      color: #ffffff;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .heroNavBtn.prev { left: 16px; }
    .heroNavBtn.next { right: 16px; }
    .heroDots {
      position: absolute;
      bottom: 14px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
      display: flex;
      gap: 8px;
    }
    .heroDot {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      border: none;
      background: rgba(255,255,255,0.5);
      cursor: pointer;
      padding: 0;
    }
    .heroDot.active { background: #ffffff; width: 24px; }

    .bannerHero {
      position: relative;
      min-height: 430px;
      display: flex;
      align-items: center;
      background: #111827;
      overflow: hidden;
      border-radius: ${bp.visualOverrides.banner.width === "container" ? "var(--irb-radius)" : "0px"};
    }
    .bannerHero__img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.7;
    }
    .bannerHero__overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, rgba(17,24,39,0.82) 0%, rgba(17,24,39,0.35) 60%, rgba(17,24,39,0.1) 100%);
    }
    .bannerHero__content { position: relative; z-index: 2; max-width: 640px; padding: 56px 28px; color: #ffffff; }
    .bannerHero__tag {
      display: inline-block;
      background: var(--primary-background);
      color: var(--primary-foreground);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      padding: 5px 10px;
      border-radius: var(--irb-radius);
      margin-bottom: 14px;
    }
    .bannerHero__title { font-size: clamp(28px, 4vw, 46px); line-height: 1.12; margin: 0 0 14px; font-weight: 700; }
    .bannerHero__subtitle { font-size: 16px; line-height: 1.5; margin: 0 0 24px; color: rgba(255,255,255,0.92); }
    .bannerHero__cta {
      display: inline-block;
      background: var(--btn-primary-background);
      color: var(--btn-primary-color);
      border: 1px solid var(--btn-primary-border);
      text-decoration: none;
      padding: 14px 28px;
      font-weight: 700;
      font-size: 14px;
      border-radius: var(--irb-radius);
    }

    /* Secondary Editorial Banner */
    .secondaryEditorial {
      border-radius: var(--irb-radius);
      overflow: hidden;
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      align-items: center;
    }
    .secondaryEditorial__text { padding: 44px 40px; }
    .secondaryEditorial__media { height: 100%; min-height: 300px; max-height: 380px; overflow: hidden; }
    .secondaryEditorial__media img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .btnSecondaryCustom {
      display: inline-block;
      padding: 13px 26px;
      border-radius: var(--irb-radius);
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      background: ${bp.theme.btnSecondaryOutline ? "transparent" : "var(--btn-secondary-background)"};
      color: ${bp.theme.btnSecondaryOutline ? "inherit" : "var(--btn-secondary-color)"};
      border: 2px solid ${bp.theme.btnSecondaryOutline ? "currentColor" : "var(--btn-secondary-border)"};
    }

    /* Listas de Produtos (.productList) */
    .productList { padding: 46px 0; }
    .productList__header { margin-bottom: 26px; }
    .productList__title { font-size: 28px; margin: 0 0 6px; font-weight: 700; }
    .productList__subtitle { margin: 0; color: #6b7280; font-size: 14px; }
    .productList__grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; }
    @media (max-width: 1024px) { .productList__grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    @media (max-width: 720px) {
      .productList__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .bannerHero { min-height: 340px; }
      .secondaryEditorial { grid-template-columns: 1fr; }
      .secondaryEditorial__text { padding: 28px 22px; }
    }
    .product.product-grid {
      background: var(--productGrid-background);
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: var(--irb-radius);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: transform .2s ease, box-shadow .2s ease;
    }
    .product.product-grid:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08); }
    .product-image-wrap {
      position: relative;
      aspect-ratio: 1 / 1;
      background: #f9fafb;
      overflow: hidden;
      cursor: pointer;
    }
    .product-image-wrap img { width: 100%; height: 100%; object-fit: cover; transition: transform .3s ease; }
    .product.product-grid:hover .product-image-wrap img { transform: scale(1.04); }
    .product-badge {
      position: absolute;
      top: 10px;
      left: 10px;
      background: var(--primary-background);
      color: var(--primary-foreground);
      font-size: 11px;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: var(--irb-radius);
      z-index: 2;
    }
    .product-info {
      padding: 14px var(--productGrid-information-padding-x) 16px;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .product-cat {
      font-size: 11px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    .product-title {
      font-family: var(--text-font-family);
      font-size: 14px;
      font-weight: 600;
      line-height: 1.35;
      margin: 0 0 10px;
      cursor: pointer;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .product-price-wrap { display: flex; align-items: baseline; gap: 8px; margin-top: auto; }
    .product-price-old { font-size: 12px; color: var(--product-old-price-color); text-decoration: line-through; }
    .product-price { font-size: 17px; font-weight: 700; color: var(--product-price-color); }
    .product-installments { font-size: 11px; color: #4b5563; margin-top: 3px; margin-bottom: 12px; }
    .product-btn {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--productList-buy-btn-border);
      border-radius: var(--irb-radius);
      background: var(--productList-buy-btn-background);
      color: var(--productList-buy-btn-foreground);
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      transition: opacity .15s;
    }
    .product-btn:hover { opacity: 0.9; }

    /* Depoimentos (.reviewModule) */
    .reviewModule { padding: 46px 0; background: var(--neutral-background); color: var(--neutral-foreground); }
    .reviewGrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
    @media (max-width: 768px) { .reviewGrid { grid-template-columns: 1fr; } }
    .reviewCard {
      background: #ffffff;
      color: #111827;
      padding: 22px;
      border-radius: var(--irb-radius);
      border: 1px solid rgba(0, 0, 0, 0.06);
    }
    .reviewCard__stars { color: #f59e0b; font-size: 16px; margin-bottom: 8px; }
    .reviewCard__text { font-size: 14px; line-height: 1.5; color: #374151; margin: 0 0 12px; }
    .reviewCard__author { font-size: 13px; font-weight: 700; color: #111827; }

    /* Newsletter (.newsletterModule) */
    .newsletterModule { padding: 44px 0; background: var(--body-background); border-top: 1px solid rgba(0, 0, 0, 0.06); }
    .newsletterBox {
      background: var(--neutral-background);
      color: var(--neutral-foreground);
      border-radius: var(--irb-radius);
      padding: 32px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }
    .newsletterForm { display: flex; gap: 10px; flex: 1 1 320px; max-width: 460px; }
    .newsletterForm input {
      flex: 1;
      padding: 12px 14px;
      border-radius: var(--irb-radius);
      border: 1px solid #d1d5db;
      font-size: 14px;
    }
    .newsletterForm button {
      background: var(--btn-primary-background);
      color: var(--btn-primary-color);
      border: 1px solid var(--btn-primary-border);
      padding: 12px 20px;
      border-radius: var(--irb-radius);
      font-weight: 700;
      cursor: pointer;
    }

    /* Rodapé */
    .footerContent--top { background: var(--footer-background); color: var(--footer-foreground); padding: 44px 0; }
    .footerGrid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 28px; }
    @media (max-width: 768px) { .footerGrid { grid-template-columns: 1fr; } }
    .footerTitle { font-size: 16px; font-weight: 700; margin: 0 0 12px; }
    .footerText { font-size: 14px; line-height: 1.6; opacity: 0.88; margin: 0; }
    .footerList { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; font-size: 14px; }
    .footerList a { color: inherit; text-decoration: none; opacity: 0.88; }
    .footerList a:hover { opacity: 1; text-decoration: underline; }
    .footerContent--bottom {
      background: var(--footer-background);
      color: var(--footer-foreground);
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      padding: 18px 0;
      font-size: 12px;
      opacity: 0.95;
    }
    .footer-legal-info {
      background: var(--footerLegal-background);
      color: var(--footerLegal-foreground);
      text-align: center;
      padding: 14px 20px;
      font-size: 12px;
    }

    /* Modais Demo */
    .irb-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(17, 24, 39, 0.65);
      z-index: 100;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .irb-modal-backdrop.open { display: flex; }
    .irb-modal-card {
      background: #ffffff;
      color: #111827;
      max-width: 780px;
      width: 100%;
      border-radius: 12px;
      overflow: hidden;
      display: grid;
      grid-template-columns: 1fr 1fr;
      position: relative;
      max-height: 90vh;
      overflow-y: auto;
    }
    @media (max-width: 680px) { .irb-modal-card { grid-template-columns: 1fr; } }
    .irb-drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(17, 24, 39, 0.55);
      z-index: 110;
      display: none;
      justify-content: flex-end;
    }
    .irb-drawer-backdrop.open { display: flex; }
    .irb-drawer-panel {
      width: 100%;
      max-width: 390px;
      background: #ffffff;
      color: #111827;
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: 20px;
    }
    .filter-pill-bar {
      display: none;
      align-items: center;
      justify-content: space-between;
      background: var(--neutral-background);
      color: var(--neutral-foreground);
      padding: 10px 16px;
      border-radius: var(--irb-radius);
      margin-top: 20px;
      font-size: 13px;
    }
    .filter-pill-bar.visible { display: flex; }
  </style>
</head>
<body class="page-common-home common-home theme-_lime">
  <div class="overlineModule">${escapeHtml(bp.sections.announcementText)}</div>

  <header class="irb-header ${headerPosClass}">
    <div class="container">
      <div class="headerContent headerContent--${bp.theme.headerLayout}">
        <a href="#top" class="headerContent_logo">${logoHtml}</a>
        <div class="headerContent_search">
          <input type="search" id="irb-search-input" placeholder="O que você está procurando?" aria-label="Buscar produtos" />
        </div>
        <div class="headerContent_actions">
          <button type="button" class="headerCartBtn" id="irb-open-cart">
            🛒 Carrinho (<span id="irb-cart-count">0</span>)
          </button>
        </div>
      </div>
      <nav class="headerContent_categories" aria-label="Categorias">
        <a href="#vitrines" class="categoryLink active" data-filter-cat="all">Todos</a>
        ${navLinksHtml}
      </nav>
    </div>
  </header>

  <main>
    <section class="bannerModule">
      <div class="${bp.visualOverrides.banner.width === "container" ? "container" : ""}" style="position:relative;">
        ${heroSlidesHtml}
        ${
          slidesToRender.length > 1
            ? `<button type="button" class="heroNavBtn prev" id="irb-hero-prev" aria-label="Slide anterior">‹</button>
               <button type="button" class="heroNavBtn next" id="irb-hero-next" aria-label="Próximo slide">›</button>
               <div class="heroDots">${slidesToRender
                 .map(
                   (_, i) =>
                     `<button type="button" class="heroDot ${i === 0 ? "active" : ""}" data-hero-dot="${i}" aria-label="Slide ${i + 1}"></button>`
                 )
                 .join("")}</div>`
            : ""
        }
      </div>
    </section>

    <section class="htmlContent" id="htmlContent-benefits">
      <div class="container">${benefitsBlock.html}</div>
    </section>

    <section class="htmlContent" id="htmlContent-mood">
      <div class="container">${moodBlock.html}</div>
    </section>

    ${
      bp.sections.slimBanner?.enabled !== false
        ? `<section class="htmlContent" id="htmlContent-slim"><div class="container">${slimBlock.html}</div></section>`
        : ""
    }

    <div class="container">
      <div id="irb-filter-bar" class="filter-pill-bar">
        <span id="irb-filter-label"></span>
        <button type="button" id="irb-clear-filter" style="background:none;border:none;color:var(--primary-background);font-weight:700;cursor:pointer;">Limpar filtro</button>
      </div>
    </div>

    <div id="vitrines">
      ${firstShowcaseHtml}
    </div>

    ${secondaryBannerHtml}

    <section class="htmlContent" id="htmlContent-story">
      <div class="container">${storyBlock.html}</div>
    </section>

    ${extraShowcasesHtml}

    <section class="reviewModule">
      <div class="container">
        <div class="productList__header" style="text-align:center;">
          <h2 class="productList__title">${escapeHtml(bp.sections.testimonialsTitle || "Quem compra recomenda")}</h2>
          <p class="productList__subtitle">Prova social integrada nativamente na plataforma Irroba</p>
        </div>
        <div class="reviewGrid">${testimonialsHtml}</div>
      </div>
    </section>

    <section class="newsletterModule">
      <div class="container">
        <div class="newsletterBox">
          <div>
            <h3 style="margin:0 0 6px;font-size:22px;">Receba novidades da ${escapeHtml(bp.brand.name)}</h3>
            <p style="margin:0;opacity:0.85;font-size:14px;">Cadastre seu e-mail para garantir ofertas exclusivas em primeira mão.</p>
          </div>
          <form class="newsletterForm" onsubmit="event.preventDefault(); this.querySelector('button').textContent='Cadastrado ✓';">
            <input type="email" required placeholder="Digite seu melhor e-mail" />
            <button type="submit">Cadastrar</button>
          </form>
        </div>
      </div>
    </section>
  </main>

  <footer class="footer">
    <div class="footerContent--top">
      <div class="${bp.visualOverrides.footer.width === "full" ? "container-full" : "container"}">
        <div class="footerGrid">
          <div>
            <h4 class="footerTitle">${escapeHtml(bp.brand.name)}</h4>
            <p class="footerText">${escapeHtml(bp.footer.aboutText)}</p>
          </div>
          <div>
            <h4 class="footerTitle">Departamentos</h4>
            <ul class="footerList">
              ${bp.sections.categories
                .slice(0, 6)
                .map((c) => `<li><a href="#vitrines" data-filter-cat="${escapeAttr(c.label.toLowerCase())}">${escapeHtml(c.label)}</a></li>`)
                .join("")}
            </ul>
          </div>
          <div>
            <h4 class="footerTitle">Atendimento</h4>
            <ul class="footerList">
              ${bp.footer.whatsapp ? `<li>WhatsApp: ${escapeHtml(bp.footer.whatsapp)}</li>` : ""}
              ${bp.footer.email ? `<li>E-mail: ${escapeHtml(bp.footer.email)}</li>` : ""}
              ${bp.footer.instagram ? `<li><a href="${escapeAttr(sanitizeUrl(bp.footer.instagram))}" target="_blank" rel="noopener">Instagram Oficial</a></li>` : ""}
              <li>Compra 100% Segura • Checkout Transparente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    <div class="footerContent--bottom">
      <div class="container" style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <span>Pagamentos: PIX • Cartão em até 6x • Boleto</span>
        <span>Segurança: SSL 256-bits • Ambiente Irroba E-commerce</span>
      </div>
    </div>
    <div class="footer-legal-info">
      © ${new Date().getFullYear()} ${escapeHtml(bp.brand.name)} — Versão Beta demonstrativa estruturada no Tema LIME da Irroba.
    </div>
  </footer>

  <!-- Modal Produto (PDP Simulada) -->
  <div id="irb-pdp-modal" class="irb-modal-backdrop" role="dialog" aria-modal="true">
    <div class="irb-modal-card">
      <button type="button" id="irb-pdp-close" style="position:absolute;top:12px;right:12px;border:none;background:#f3f4f6;width:32px;height:32px;border-radius:999px;cursor:pointer;font-weight:700;">✕</button>
      <div style="background:#f9fafb;padding:20px;display:flex;flex-direction:${bp.visualOverrides.pageProduct.galleryOrientation === "vertical" ? "row" : "column"};gap:12px;align-items:center;justify-content:center;">
        <img id="irb-pdp-img" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="Prévia do produto" style="width:100%;max-height:340px;object-fit:contain;border-radius:8px;" />
      </div>
      <div style="padding:26px;display:flex;flex-direction:column;gap:12px;">
        <span id="irb-pdp-cat" style="font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.06em;"></span>
        <h3 id="irb-pdp-title" style="margin:0;font-size:22px;line-height:1.25;"></h3>
        <div style="display:flex;align-items:baseline;gap:10px;">
          <span id="irb-pdp-old" style="font-size:14px;color:var(--product-old-price-color);text-decoration:line-through;"></span>
          <span id="irb-pdp-price" style="font-size:26px;font-weight:700;color:var(--product-price-color);"></span>
        </div>
        <div id="irb-pdp-installments" style="font-size:13px;color:#4b5563;"></div>
        <p id="irb-pdp-desc" style="font-size:14px;line-height:1.5;color:#374151;margin:4px 0 12px;"></p>
        <button type="button" id="irb-pdp-add" class="product-btn" style="padding:14px;font-size:15px;">${escapeHtml(bp.visualOverrides.pageProduct.buyButtonText)}</button>
      </div>
    </div>
  </div>

  <!-- Mini-Carrinho Lateral -->
  <div id="irb-cart-drawer" class="irb-drawer-backdrop" role="dialog" aria-modal="true">
    <div class="irb-drawer-panel">
      <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:14px;border-bottom:1px solid #e5e7eb;">
        <strong style="font-size:18px;">Seu Carrinho</strong>
        <button type="button" id="irb-cart-close" style="border:none;background:#f3f4f6;width:30px;height:30px;border-radius:999px;cursor:pointer;">✕</button>
      </div>
      <div id="irb-cart-items" style="flex:1;overflow-y:auto;padding:14px 0;display:flex;flex-direction:column;gap:12px;"></div>
      <div style="border-top:1px solid #e5e7eb;padding-top:14px;">
        <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;margin-bottom:12px;">
          <span>Subtotal</span>
          <span id="irb-cart-total">R$ 0,00</span>
        </div>
        <button type="button" onclick="alert('Checkout Transparente Irroba pronto para conversão!')" class="product-btn" style="padding:14px;font-size:14px;">Finalizar Compra (Demo)</button>
      </div>
    </div>
  </div>

  <script>
    (function () {
      const PRODUCTS = ${safeProductsJson};
      const cart = [];
      let activeCategory = 'all';
      let searchQuery = '';
      let activePdpId = null;

      // Hero Carousel
      const slides = Array.from(document.querySelectorAll('.heroSlide'));
      const dots = Array.from(document.querySelectorAll('.heroDot'));
      let slideIdx = 0;
      function showSlide(nextIdx) {
        if (slides.length <= 1) return;
        slideIdx = (nextIdx + slides.length) % slides.length;
        slides.forEach((s, i) => s.classList.toggle('active', i === slideIdx));
        dots.forEach((d, i) => d.classList.toggle('active', i === slideIdx));
      }
      const prevBtn = document.getElementById('irb-hero-prev');
      const nextBtn = document.getElementById('irb-hero-next');
      if (prevBtn) prevBtn.addEventListener('click', () => showSlide(slideIdx - 1));
      if (nextBtn) nextBtn.addEventListener('click', () => showSlide(slideIdx + 1));
      dots.forEach((dot) => {
        dot.addEventListener('click', () => showSlide(Number(dot.getAttribute('data-hero-dot') || 0)));
      });
      if (slides.length > 1) {
        setInterval(() => showSlide(slideIdx + 1), 6000);
      }

      const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

      function applyFilters() {
        const cards = document.querySelectorAll('.product.product-grid');
        let visibleCount = 0;
        cards.forEach((card) => {
          const title = card.getAttribute('data-title') || '';
          const cat = card.getAttribute('data-category') || '';
          const matchesSearch = !searchQuery || title.includes(searchQuery) || cat.includes(searchQuery);
          const matchesCat = activeCategory === 'all' || cat.includes(activeCategory) || title.includes(activeCategory);
          const show = matchesSearch && matchesCat;
          card.style.display = show ? 'flex' : 'none';
          if (show) visibleCount++;
        });

        const bar = document.getElementById('irb-filter-bar');
        const label = document.getElementById('irb-filter-label');
        if (searchQuery || activeCategory !== 'all') {
          bar.classList.add('visible');
          label.textContent = 'Exibindo ' + visibleCount + ' produto(s)' + (activeCategory !== 'all' ? ' em "' + activeCategory + '"' : '') + (searchQuery ? ' para "' + searchQuery + '"' : '');
        } else {
          bar.classList.remove('visible');
        }
      }

      document.getElementById('irb-search-input').addEventListener('input', (e) => {
        searchQuery = (e.target.value || '').trim().toLowerCase();
        applyFilters();
      });

      document.querySelectorAll('[data-filter-cat], [data-irb-cat]').forEach((link) => {
        link.addEventListener('click', () => {
          const catAttr = link.getAttribute('data-filter-cat') || link.getAttribute('data-irb-cat') || 'all';
          activeCategory = catAttr.toLowerCase();
          document.querySelectorAll('.categoryLink').forEach((c) => c.classList.remove('active'));
          if (link.classList.contains('categoryLink')) link.classList.add('active');
          applyFilters();
        });
      });

      document.getElementById('irb-clear-filter').addEventListener('click', () => {
        activeCategory = 'all';
        searchQuery = '';
        document.getElementById('irb-search-input').value = '';
        applyFilters();
      });

      function renderCart() {
        const countEl = document.getElementById('irb-cart-count');
        const itemsEl = document.getElementById('irb-cart-items');
        const totalEl = document.getElementById('irb-cart-total');

        const totalQty = cart.reduce((acc, item) => acc + item.qty, 0);
        const totalAmt = cart.reduce((acc, item) => acc + item.product.price * item.qty, 0);
        countEl.textContent = String(totalQty);
        totalEl.textContent = formatCurrency(totalAmt);

        if (cart.length === 0) {
          itemsEl.innerHTML = '<p style="color:#6b7280;font-size:14px;text-align:center;margin-top:40px;">Seu carrinho está vazio. Clique em comprar em qualquer produto para testar!</p>';
          return;
        }

        itemsEl.innerHTML = '';
        cart.forEach((item, idx) => {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;gap:12px;align-items:center;border-bottom:1px solid #f3f4f6;padding-bottom:10px;';

          const img = document.createElement('img');
          img.src = item.product.imageUrl || '';
          img.alt = item.product.title || '';
          img.style.cssText = 'width:56px;height:56px;object-fit:cover;border-radius:6px;';

          const info = document.createElement('div');
          info.style.cssText = 'flex:1;min-width:0;';

          const titleEl = document.createElement('div');
          titleEl.style.cssText = 'font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
          titleEl.textContent = item.product.title || '';

          const priceEl = document.createElement('div');
          priceEl.style.cssText = 'font-size:13px;color:#4b5563;';
          priceEl.textContent = item.qty + 'x ' + formatCurrency(item.product.price);

          info.appendChild(titleEl);
          info.appendChild(priceEl);

          const removeBtn = document.createElement('button');
          removeBtn.type = 'button';
          removeBtn.style.cssText = 'border:none;background:none;color:#ef4444;cursor:pointer;font-size:12px;font-weight:700;';
          removeBtn.textContent = 'Remover';
          removeBtn.addEventListener('click', () => {
            cart.splice(idx, 1);
            renderCart();
          });

          row.appendChild(img);
          row.appendChild(info);
          row.appendChild(removeBtn);
          itemsEl.appendChild(row);
        });
      }

      function addToCart(productId) {
        const product = PRODUCTS.find((p) => p.id === productId);
        if (!product) return;
        const existing = cart.find((c) => c.product.id === productId);
        if (existing) existing.qty += 1;
        else cart.push({ product, qty: 1 });
        renderCart();
        document.getElementById('irb-cart-drawer').classList.add('open');
      }

      document.querySelectorAll('[data-add-cart]').forEach((btn) => {
        btn.addEventListener('click', () => addToCart(btn.getAttribute('data-add-cart')));
      });

      document.querySelectorAll('[data-open-pdp]').forEach((el) => {
        el.addEventListener('click', () => {
          const pid = el.getAttribute('data-open-pdp');
          const product = PRODUCTS.find((p) => p.id === pid);
          if (!product) return;
          activePdpId = pid;
          document.getElementById('irb-pdp-img').src = product.imageUrl;
          document.getElementById('irb-pdp-cat').textContent = product.category;
          document.getElementById('irb-pdp-title').textContent = product.title;
          document.getElementById('irb-pdp-price').textContent = formatCurrency(product.price);
          document.getElementById('irb-pdp-old').textContent = product.compareAtPrice && product.compareAtPrice > product.price ? formatCurrency(product.compareAtPrice) : '';
          document.getElementById('irb-pdp-installments').textContent = product.installmentsText || '';
          document.getElementById('irb-pdp-desc').textContent = product.description || '';
          document.getElementById('irb-pdp-modal').classList.add('open');
        });
      });

      document.getElementById('irb-pdp-add').addEventListener('click', () => {
        if (activePdpId) {
          document.getElementById('irb-pdp-modal').classList.remove('open');
          addToCart(activePdpId);
        }
      });

      document.getElementById('irb-pdp-close').addEventListener('click', () => {
        document.getElementById('irb-pdp-modal').classList.remove('open');
      });
      document.getElementById('irb-open-cart').addEventListener('click', () => {
        renderCart();
        document.getElementById('irb-cart-drawer').classList.add('open');
      });
      document.getElementById('irb-cart-close').addEventListener('click', () => {
        document.getElementById('irb-cart-drawer').classList.remove('open');
      });
    })();
  </script>
</body>
</html>`;
}
