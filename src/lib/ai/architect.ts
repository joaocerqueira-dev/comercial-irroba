import { mimeFromFilename } from "@/lib/files/mime";
import { isApparelText, isFootwearText } from "@/lib/catalog/niche";
import fs from "node:fs/promises";
import path from "node:path";
import { generateText, type ImagePart, type TextPart } from "ai";
import { describeAiError } from "./errors";
import type { UserTextAi } from "./providers";
import {
  contrastRatio,
  darkenHex,
  getContrastingForeground,
  isLightColor,
  isNearWhiteOrBlack,
  lightenHex,
  normalizeHex,
} from "./color-utils";
import { sanitizeFontName } from "@/lib/irroba-blocks/sanitize";
import {
  COLOR_DERIVATION,
  COLOR_THRESHOLDS,
  DEFAULT_COPY,
  AI_ARCHITECT,
  HEADER_DEFAULTS,
  PALETTE,
  PLACEHOLDER_IMAGES,
  PRODUCT_CARD_DEFAULTS,
  SECTION_HEADING_PATTERNS,
  SECTION_LIMITS,
  SYSTEM_FONTS,
  ALLOWED_BODY_FONTS,
  ALLOWED_FONTS,
  ALLOWED_HEADING_FONTS,
  matchAllowedFont,
  pickFontPairingForStore,
  mapBorderRadius,
} from "@/lib/layout-patterns";
import {
  sanitizeBlueprintImageUrls,
  StoreBlueprintSchema,
  type DesignInsight,
  type ExtractedStoreData,
  type StoreBlueprint,
} from "@/lib/types/blueprint";

export function ensureReadableForeground(bg: string, candidate?: string): string {
  const norm = normalizeHex(candidate, "");
  if (norm && contrastRatio(bg, norm) >= COLOR_THRESHOLDS.minContrast) {
    return norm;
  }
  return getContrastingForeground(bg);
}

function inferNicheAndTone(extracted: ExtractedStoreData): {
  niche: string;
  tone: StoreBlueprint["brand"]["tone"];
} {
  const haystack = [
    extracted.storeName,
    extracted.description ?? "",
    ...extracted.categories.map((c) => c.label),
    ...extracted.products.slice(0, 6).map((p) => p.title),
  ]
    .join(" ")
    .toLowerCase();

  const hasFootwear = isFootwearText(haystack);
  const hasApparel = isApparelText(haystack);
  const isVeganOrEco = /vegano|vegan|sustent|eco|organic|natural|vegetal/.test(haystack);

  if (isVeganOrEco) {
    return hasFootwear
      ? { niche: "Calçados Veganos", tone: "minimal" }
      : { niche: "Moda Sustentável", tone: "minimal" };
  }
  if (hasFootwear && !/vestido|blusa|blazer|camiseta/.test(haystack)) {
    return { niche: "Calçados", tone: "modern" };
  }
  if (hasApparel) {
    return { niche: "Moda & Vestuário", tone: "modern" };
  }
  if (hasFootwear) {
    return { niche: "Calçados", tone: "modern" };
  }
  if (/joia|semi|relogio|perfume|cosmetic|skincare|beleza/.test(haystack)) {
    return { niche: "Beleza & Acessórios", tone: "luxury" };
  }
  if (/suplement|whey|fitness|academia|esporte|corrida/.test(haystack)) {
    return { niche: "Saúde & Esporte", tone: "vibrant" };
  }
  if (/eletronic|celular|fone|notebook|gamer|tech|informatica/.test(haystack)) {
    return { niche: "Tecnologia & Eletrônicos", tone: "tech" };
  }
  return { niche: "Varejo Online", tone: "modern" };
}

function pickFontPairing(extracted: ExtractedStoreData, tone: StoreBlueprint["brand"]["tone"]) {
  const rawHeading = sanitizeFontName(extracted.tokens.headingFont, "");
  const rawBody = sanitizeFontName(extracted.tokens.bodyFont, "");

  const knownSystemFonts: readonly string[] = SYSTEM_FONTS;
  const hasGoodHeading = rawHeading && !knownSystemFonts.includes(rawHeading.toLowerCase());
  const hasGoodBody = rawBody && !knownSystemFonts.includes(rawBody.toLowerCase());

  if (hasGoodHeading && hasGoodBody) {
    return { heading: rawHeading, body: rawBody };
  }

  const storeText = [
    extracted.storeName,
    extracted.description ?? "",
    ...extracted.categories.map((c) => c.label),
    ...extracted.products.slice(0, 6).map((p) => p.title),
  ].join(" ");
  return pickFontPairingForStore(storeText, tone);
}

function pickSectionHeading(headings: string[], keywords: RegExp, fallback: string): string {
  const match = headings.find((h) => keywords.test(h.toLowerCase()));
  return match || fallback;
}

function buildDesignInsights(
  extracted: ExtractedStoreData,
  theme: StoreBlueprint["theme"],
  heroBannerCount: number,
  secondaryBannerCount: number
): DesignInsight[] {
  const insights: DesignInsight[] = [];

  insights.push({
    id: "palette-preserved",
    category: "palette",
    severity: "info",
    title: "Identidade visual original preservada",
    description: `Extraímos a paleta real da loja (${theme.primaryBackground} nos botões/destaques, ${theme.neutralBackground} nas superfícies e ${theme.secondaryBackground} no rodapé) para manter reconhecimento imediato de marca no preview.`,
  });

  const btnContrast = contrastRatio(theme.btnPrimaryBackground, theme.btnPrimaryColor);
  if (btnContrast < COLOR_THRESHOLDS.minContrast) {
    const fixedColor = getContrastingForeground(theme.btnPrimaryBackground);
    insights.push({
      id: "contrast-cta-fix",
      category: "contrast",
      severity: "suggestion",
      title: `Contraste baixo detectado nos botões (${btnContrast}:1)`,
      description: `O texto atual sobre a cor primária tem contraste abaixo do padrão WCAG AA (4.5:1). Recomendamos ajustar o texto do botão para ${fixedColor} para melhorar legibilidade e clique.`,
      actionLabel: "Aplicar alto contraste nos botões",
      suggestedThemePatch: {
        primaryForeground: fixedColor,
        btnPrimaryColor: fixedColor,
        buyBtnForeground: fixedColor,
      },
    });
  }

  if (isNearWhiteOrBlack(theme.primaryBackground)) {
    insights.push({
      id: "conversion-cta-accent",
      category: "conversion",
      severity: "suggestion",
      title: "Sugestão: testar cor de destaque nos botões de compra",
      description: `A loja original usa paleta monocromática (${theme.primaryBackground}) nos botões principais. Isso mantém sobriedade, mas em testes A/B de e-commerce um botão de compra em destaque (ex: Verde Conversão ${PALETTE.conversionGreen} ou Terracota #C2410C) costuma elevar o CTR no mobile.`,
      actionLabel: "Testar botão Verde Conversão",
      suggestedThemePatch: {
        btnPrimaryBackground: PALETTE.conversionGreen,
        btnPrimaryColor: "#FFFFFF",
        buyBtnBackground: PALETTE.conversionGreen,
        buyBtnForeground: "#FFFFFF",
      },
    });
  }

  if (heroBannerCount > 0 || secondaryBannerCount > 0) {
    insights.push({
      id: "banners-preserved",
      category: "banners",
      severity: "info",
      title: `${heroBannerCount + secondaryBannerCount} banner(s) reais importados sem sobreposição`,
      description:
        "Os banners de campanha encontrados no site foram configurados no modo Arte Original para preservar sua tipografia e identidade, sem textos genéricos por cima.",
    });
  } else {
    insights.push({
      id: "banners-proposed",
      category: "banners",
      severity: "suggestion",
      title: "Banners promocionais propostos automaticamente",
      description:
        "Não detectamos banners secundários ou slim explícitos na home original; adicionamos faixas visuais na paleta da loja que você pode editar ou ocultar na aba Banners.",
    });
  }

  return insights;
}

export function buildHeuristicBlueprint(extracted: ExtractedStoreData): StoreBlueprint {
  const { niche, tone } = inferNicheAndTone(extracted);
  const fonts = pickFontPairing(extracted, tone);

  // Faithful palette extraction from original site
  const bodyBackground = normalizeHex(extracted.tokens.bodyBackground, PALETTE.white);
  const bodyForeground = ensureReadableForeground(
    bodyBackground,
    extracted.tokens.bodyForeground
  );

  const headerBackground = normalizeHex(extracted.tokens.headerBackground, bodyBackground);
  const headerForeground = ensureReadableForeground(
    headerBackground,
    extracted.tokens.headerForeground
  );

  const primaryBackground = normalizeHex(
    extracted.tokens.primaryButtonBg ?? extracted.tokens.accentColor ?? extracted.tokens.announcementBackground,
    PALETTE.ink
  );
  const primaryForeground = ensureReadableForeground(
    primaryBackground,
    extracted.tokens.primaryButtonColor
  );

  // Secondary / Footer background: strictly follow extracted footer/secondary, NO green fallback!
  const rawFooterBg = normalizeHex(
    extracted.tokens.footerBackground ?? extracted.tokens.secondaryButtonBg,
    isLightColor(primaryBackground) ? PALETTE.footerDark : darkenHex(primaryBackground, COLOR_DERIVATION.footerDarken)
  );
  const secondaryBackground = rawFooterBg === bodyBackground ? PALETTE.footerDark : rawFooterBg;
  const secondaryForeground = ensureReadableForeground(
    secondaryBackground,
    extracted.tokens.footerForeground
  );

  // Neutral surface: use real extracted surface section color (e.g. beige/cream/light gray), NEVER tinted green
  const rawSurface = normalizeHex(extracted.tokens.surfaceBackground, "");
  const neutralBackground =
    rawSurface && rawSurface !== bodyBackground && isLightColor(rawSurface)
      ? rawSurface
      : isNearWhiteOrBlack(primaryBackground)
        ? PALETTE.neutralSurface
        : lightenHex(primaryBackground, COLOR_DERIVATION.neutralLighten);
  const neutralForeground = getContrastingForeground(neutralBackground);

  const announcementBackground = normalizeHex(
    extracted.tokens.announcementBackground,
    isLightColor(primaryBackground) ? PALETTE.ink : primaryBackground
  );
  const announcementForeground = ensureReadableForeground(
    announcementBackground,
    extracted.tokens.announcementForeground
  );

  const btnSecondaryBg = normalizeHex(extracted.tokens.secondaryButtonBg, PALETTE.ink);
  const btnSecondaryFg = ensureReadableForeground(
    btnSecondaryBg,
    extracted.tokens.secondaryButtonColor
  );

  const legalBackground = darkenHex(secondaryBackground, COLOR_DERIVATION.legalDarken);
  const legalForeground = ensureReadableForeground(legalBackground, secondaryForeground);

  const radius = mapBorderRadius(extracted.tokens.borderRadiusPx);

  const fallbackProducts: StoreBlueprint["products"] =
    extracted.products.length > 0
      ? extracted.products.map((p) => ({
          id: p.id,
          title: p.title,
          price: p.price,
          compareAtPrice: p.compareAtPrice,
          imageUrl: p.imageUrl,
          images: p.images && p.images.length > 0 ? p.images : [p.imageUrl],
          category: p.category || DEFAULT_COPY.productCategory,
          categories: p.categories && p.categories.length > 0 ? p.categories : [p.category || DEFAULT_COPY.productCategory],
          installmentsText: DEFAULT_COPY.installments(p.price, SECTION_LIMITS.installments),
          description:
            p.description ||
            `${p.title} selecionado especialmente para você na nova loja ${extracted.storeName} na plataforma Irroba.`,
          visible: true,
        }))
      : [
          {
            id: "demo-1",
            title: `Produto Destaque ${extracted.storeName}`,
            price: 199.9,
            compareAtPrice: 249.9,
            imageUrl:
              extracted.banners[0]?.imageUrl ||
              PLACEHOLDER_IMAGES.product,
            images: [
              extracted.banners[0]?.imageUrl ||
                PLACEHOLDER_IMAGES.product,
            ],
            category: "Destaques",
            categories: ["Destaques"],
            installmentsText: "em até 6x de R$ 33,31 sem juros",
            description: "Item de demonstração para apresentação de layout personalizado na Irroba.",
            visible: true,
          },
        ];

  const half = Math.ceil(fallbackProducts.length / 2);
  const firstShowcaseIds = fallbackProducts.slice(0, Math.min(SECTION_LIMITS.productsPerShowcase, half)).map((p) => p.id);
  const secondShowcaseIds = fallbackProducts.slice(half, half + SECTION_LIMITS.productsPerShowcase).map((p) => p.id);

  const showcases: StoreBlueprint["sections"]["showcases"] = [
    {
      title: pickSectionHeading(
        extracted.sectionHeadings,
        SECTION_HEADING_PATTERNS.showcase1,
        DEFAULT_COPY.showcase1Title
      ),
      subtitle: DEFAULT_COPY.showcase1Subtitle,
      productIds: firstShowcaseIds.length > 0 ? firstShowcaseIds : fallbackProducts.map((p) => p.id),
    },
  ];
  if (secondShowcaseIds.length > 0) {
    showcases.push({
      title: pickSectionHeading(
        extracted.sectionHeadings,
        SECTION_HEADING_PATTERNS.showcase2,
        DEFAULT_COPY.showcase2Title
      ),
      subtitle: DEFAULT_COPY.showcase2Subtitle,
      productIds: secondShowcaseIds,
    });
  }

  // Classify banners from extracted slots
  const heroExtracted = extracted.banners.filter((b) => b.slot === "hero");
  const slimExtracted = extracted.banners.find((b) => b.slot === "slim");
  const moodExtracted = extracted.banners.filter((b) => b.slot === "mood");
  const secondaryExtracted = extracted.banners.find((b) => b.slot === "secondary");
  const benefitsExtracted = extracted.banners.filter((b) => b.slot === "benefits");

  const benefitsBg = normalizeHex(
    extracted.tokens.benefitsBackground ?? extracted.tokens.surfaceBackground,
    neutralBackground
  );
  const benefitsBanner: StoreBlueprint["sections"]["benefitsBanner"] =
    benefitsExtracted.length > 0
      ? {
          mode: "site-images",
          backgroundColor: benefitsBg,
          textColor: getContrastingForeground(benefitsBg),
          siteImageUrls: benefitsExtracted.slice(0, SECTION_LIMITS.benefitImages).map((b) => b.imageUrl),
        }
      : {
          mode: "generated-art",
          backgroundColor: neutralBackground,
          textColor: neutralForeground,
          siteImageUrls: [],
        };

  const primaryHeroImage =
    heroExtracted[0]?.imageUrl ||
    extracted.banners[0]?.imageUrl ||
    fallbackProducts[0]?.imageUrl ||
    PLACEHOLDER_IMAGES.hero;

  const heroSlides: StoreBlueprint["sections"]["heroSlides"] =
    heroExtracted.length > 0
      ? heroExtracted.slice(0, SECTION_LIMITS.heroSlides).map((b, idx) => ({
          id: `slide-${idx + 1}`,
          imageUrl: b.imageUrl,
          headline: b.alt || `${extracted.storeName} — Coleção em Destaque`,
          subheadline:
            extracted.description?.slice(0, 120) ||
            "Qualidade, autenticidade e entrega rápida para todo o Brasil.",
          ctaText: "Ver Coleção",
          ctaHref: "#vitrines",
          mode: "artwork" as const,
          enabled: true,
        }))
      : [
          {
            id: "slide-1",
            imageUrl: primaryHeroImage,
            headline: `${extracted.storeName}: nova experiência de compra`,
            subheadline:
              extracted.description?.slice(0, 130) ||
              "Navegação mais rápida, vitrine inteligente e checkout transparente.",
            ctaText: "Ver Coleção",
            ctaHref: "#vitrines",
            mode: "editorial" as const,
            enabled: true,
          },
        ];

  const categories =
    extracted.categories.length > 0
      ? extracted.categories.slice(0, SECTION_LIMITS.categories).map((cat, idx) => {
          const matchingProd = fallbackProducts.find(
            (p) =>
              p.categories.some((c) => c.toLowerCase() === cat.label.toLowerCase()) ||
              p.title.toLowerCase().includes(cat.label.toLowerCase().replace(/s$/, ""))
          );
          return {
            label: cat.label,
            href: `#cat-${idx + 1}`,
            imageUrl:
              matchingProd?.imageUrl ?? fallbackProducts[idx % fallbackProducts.length]?.imageUrl,
          };
        })
      : [
          { label: "Novidades", href: "#novidades", imageUrl: fallbackProducts[0]?.imageUrl },
          {
            label: "Mais Vendidos",
            href: "#mais-vendidos",
            imageUrl: fallbackProducts[1 % fallbackProducts.length]?.imageUrl,
          },
          {
            label: "Ofertas",
            href: "#ofertas",
            imageUrl: fallbackProducts[2 % fallbackProducts.length]?.imageUrl,
          },
        ];

  const moodBanners: StoreBlueprint["sections"]["moodBanners"] =
    moodExtracted.length >= SECTION_LIMITS.moodBannersMinExtracted
      ? moodExtracted.slice(0, SECTION_LIMITS.moodBanners).map((m, idx) => ({
          id: `mood-${idx + 1}`,
          title: m.label || categories[idx]?.label || `Coleção ${idx + 1}`,
          subtitle: "Explorar seleção",
          imageUrl: m.imageUrl,
          href: "#vitrines",
          enabled: true,
        }))
      : categories.slice(0, SECTION_LIMITS.moodBanners).map((c, idx) => ({
          id: `mood-${idx + 1}`,
          title: c.label,
          subtitle: "Ver modelos",
          imageUrl: c.imageUrl || fallbackProducts[idx % fallbackProducts.length]?.imageUrl || primaryHeroImage,
          href: "#vitrines",
          enabled: true,
        }));

  const slimBanner: StoreBlueprint["sections"]["slimBanner"] = slimExtracted
    ? {
        enabled: true,
        mode: "image",
        imageUrl: slimExtracted.imageUrl,
        badgeText: DEFAULT_COPY.slimBadge,
        headline: slimExtracted.alt || `Condições especiais na ${extracted.storeName}`,
        ctaText: DEFAULT_COPY.slimCtaImage,
        backgroundColor: secondaryBackground,
        textColor: secondaryForeground,
      }
    : {
        enabled: true,
        mode: "designed",
        imageUrl: "",
        badgeText: DEFAULT_COPY.slimBadge,
        headline:
          extracted.announcementText ||
          `5% OFF no PIX + Parcele em até 6x sem juros na ${extracted.storeName}`,
        ctaText: DEFAULT_COPY.slimCtaDesigned,
        backgroundColor: secondaryBackground,
        textColor: secondaryForeground,
      };

  const secondaryBanner: StoreBlueprint["sections"]["secondaryBanner"] = secondaryExtracted
    ? {
        enabled: true,
        mode: "artwork",
        imageUrl: secondaryExtracted.imageUrl,
        headline: secondaryExtracted.alt || `Destaques ${extracted.storeName}`,
        subheadline: "Confira a seleção especial preparada para você.",
        ctaText: "Ver Produtos",
        backgroundColor: secondaryBackground,
        textColor: secondaryForeground,
      }
    : {
        enabled: true,
        mode: "editorial",
        imageUrl:
          fallbackProducts[Math.min(3, fallbackProducts.length - 1)]?.imageUrl || primaryHeroImage,
        headline: `Autenticidade e estilo em cada detalhe`,
        subheadline:
          extracted.description?.slice(0, 120) ||
          `Explore os modelos mais procurados da ${extracted.storeName} com envio rápido para todo o Brasil.`,
        ctaText: "Explorar Coleção",
        backgroundColor: secondaryBackground,
        textColor: secondaryForeground,
      };

  const theme: StoreBlueprint["theme"] = {
    primaryBackground,
    primaryForeground,
    secondaryBackground,
    secondaryForeground,
    neutralBackground,
    neutralForeground,
    bodyBackground,
    bodyForeground,
    btnPrimaryBackground: primaryBackground,
    btnPrimaryColor: primaryForeground,
    btnPrimaryBorder: "transparent",
    btnSecondaryBackground: btnSecondaryBg,
    btnSecondaryColor: btnSecondaryFg,
    btnSecondaryBorder: primaryBackground,
    btnSecondaryOutline: true,
    headingFont: fonts.heading,
    bodyFont: fonts.body,
    radius,
    headerLayout: HEADER_DEFAULTS.layout,
  };

  const designInsights = buildDesignInsights(
    extracted,
    theme,
    heroExtracted.length,
    (slimExtracted ? 1 : 0) + (secondaryExtracted ? 1 : 0)
  );

  // Dados da extração podem trazer imagem que o schema rejeita (data:, URL longa)
  return sanitizeBlueprintImageUrls<StoreBlueprint>({
    brand: {
      name: extracted.storeName,
      logoUrl: extracted.logoUrl || extracted.faviconUrl || "",
      niche,
      tone,
    },
    theme,
    visualOverrides: {
      announcement: {
        background: announcementBackground,
        foreground: announcementForeground,
      },
      header: {
        position: extracted.tokens.headerIsOverlay ? "sticky" : "default",
        expanded: true,
        gradientTransition: false,
        background: headerBackground,
        foreground: headerForeground,
        backgroundOpacity: HEADER_DEFAULTS.backgroundOpacity,
        blurPx: HEADER_DEFAULTS.blurPx,
        highContrastLogoOnHover: false,
        categoryCase: HEADER_DEFAULTS.categoryCase,
      },
      banner: {
        width: "full",
      },
      productCard: {
        listWidth: "container",
        titleAlign: PRODUCT_CARD_DEFAULTS.titleAlign,
        cardBackground: bodyBackground,
        paddingX: PRODUCT_CARD_DEFAULTS.paddingX,
        buyBtnBackground: primaryBackground,
        buyBtnForeground: primaryForeground,
        buyBtnBorder: "transparent",
        priceColor: bodyForeground,
        oldPriceColor: PALETTE.oldPrice,
      },
      pageProduct: {
        galleryOrientation: "vertical",
        buyButtonText: DEFAULT_COPY.buyButton,
      },
      footer: {
        width: "container",
        background: secondaryBackground,
        foreground: secondaryForeground,
        legalBackground,
        legalForeground,
      },
    },
    sections: {
      announcementText:
        extracted.announcementText ||
        DEFAULT_COPY.announcement,
      categories,
      hero: {
        headline: heroSlides[0]?.headline || `${extracted.storeName}`,
        subheadline: heroSlides[0]?.subheadline || "",
        ctaText: heroSlides[0]?.ctaText || "Ver Coleção",
        imageUrl: primaryHeroImage,
      },
      heroSlides,
      benefitsBanner,
      slimBanner,
      moodSectionTitle: pickSectionHeading(
        extracted.sectionHeadings,
        SECTION_HEADING_PATTERNS.mood,
        DEFAULT_COPY.moodSectionTitle
      ),
      moodBanners,
      secondaryBanner,
      promoStripText: `Descubra a essência e os detalhes de ${extracted.storeName}`,
      benefits: DEFAULT_COPY.benefits.map((b) => ({ ...b })),
      showcases,
      testimonialsTitle: pickSectionHeading(
        extracted.sectionHeadings,
        SECTION_HEADING_PATTERNS.testimonials,
        DEFAULT_COPY.testimonialsTitle
      ),
      testimonialsIllustrative: true,
      testimonials: [
        {
          author: "Mariana S.",
          rating: 5,
          comment: `Comprei na ${extracted.storeName} e me surpreendi com a qualidade e rapidez na entrega!`,
        },
        {
          author: "Rafael O.",
          rating: 5,
          comment: "Atendimento excelente e site super fácil de escolher o modelo certo.",
        },
        {
          author: "Camila P.",
          rating: 5,
          comment: "Produto idêntico às fotos, pagamento no PIX aprovado na hora. Recomendo muito!",
        },
      ],
    },
    products: fallbackProducts,
    footer: {
      aboutText:
        extracted.description?.slice(0, 200) ||
        `${extracted.storeName} — Curadoria especial com qualidade, estilo e entrega para todo o Brasil.`,
      whatsapp: extracted.contacts.whatsapp,
      instagram: extracted.contacts.instagram,
      email: extracted.contacts.email,
      ...(extracted.contacts.facebook ? { facebook: extracted.contacts.facebook } : {}),
      ...(extracted.contacts.phone ? { phone: extracted.contacts.phone } : {}),
      ...(extracted.contacts.address ? { address: extracted.contacts.address } : {}),
      ...(extracted.contacts.cnpj ? { cnpj: extracted.contacts.cnpj } : {}),
    },
    designInsights,
  });
}

export interface ArchitectResult {
  blueprint: StoreBlueprint;
  mode: "ai" | "heuristic";
  aiProvider?: string;
  modelUsed?: string;
  aiError?: string;
}

export function extractJsonObject(raw: string): Record<string, unknown> {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned) as Record<string, unknown>;
}

export async function buildStoreBlueprint(
  extracted: ExtractedStoreData,
  options: { signal?: AbortSignal; ai?: UserTextAi | null } = {}
): Promise<ArchitectResult> {
  const baseBlueprint = buildHeuristicBlueprint(extracted);
  const userAi = options.ai;

  if (!userAi) {
    return {
      blueprint: {
        ...baseBlueprint,
        designInsights: [
          {
            id: "ai-not-configured",
            category: "palette",
            severity: "suggestion",
            title: "Configure sua IA para gerar com IA",
            description: "Layout montado em modo heurístico. Cadastre sua chave em Minha IA (/conta/ia) para analisar a identidade visual com IA.",
          },
          ...baseBlueprint.designInsights,
        ],
      },
      mode: "heuristic",
    };
  }

  const model = userAi.modelId;
  const parts: Array<TextPart | ImagePart> = [];

  const capturePaths = [
    { imgPath: extracted.screenshotPath, maxBytes: 4_000_000 },
    { imgPath: extracted.fullScreenshotPath, maxBytes: 2_600_000 },
  ];

  let attachedScreenshots = 0;
  // Provedor sem imagem na entrada (openai-compatible): só os dados do DOM
  for (const { imgPath, maxBytes } of userAi.supportsImageInput ? capturePaths : []) {
    if (!imgPath) continue;
    const filename = path.basename(imgPath);
    const diskPath = path.join(process.cwd(), "public", "captures", filename);
    try {
      const stat = await fs.stat(diskPath);
      if (stat.size > maxBytes) continue;
      const imgBuffer = await fs.readFile(diskPath);
      parts.push({ type: "image", image: imgBuffer, mediaType: mimeFromFilename(filename) });
      attachedScreenshots += 1;
    } catch {
      // Skip unavailable captures
    }
  }

  const prompt = `Você é um Diretor de Arte, Especialista em Identidade Visual e CRO da plataforma Irroba E-commerce (Tema LIME).
Analise visualmente ${attachedScreenshots > 0 ? "os screenshots anexados" : "os dados extraídos"} da loja "${extracted.storeName}" (${extracted.detectedPlatform}) para recriar fielmente a IDENTIDADE VISUAL da marca no Tema LIME da Irroba.

Dados extraídos do DOM:
- URL: ${extracted.sourceUrl}
- Descrição: ${extracted.description || "Não informada"}
- Categorias do menu: ${extracted.categories.map((c) => c.label).join(", ") || "Nenhuma"}
- Títulos de seções encontrados no site: ${extracted.sectionHeadings.join(" | ") || "Nenhum"}
- Amostra de produtos: ${extracted.products
    .slice(0, 10)
    .map((p) => `${p.title} (${p.category} - R$ ${p.price.toFixed(2)})`)
    .join(" | ")}
- Paleta base detectada via CSS: body=${baseBlueprint.theme.bodyBackground}, header=${baseBlueprint.visualOverrides.header.background}, announcement=${baseBlueprint.visualOverrides.announcement.background}, primary=${baseBlueprint.theme.primaryBackground}, secondary=${baseBlueprint.theme.secondaryBackground}, neutral=${baseBlueprint.theme.neutralBackground}

Diretrizes obrigatórias:
1. FIDELIDADE VISUAL ACIMA DE TUDO: Observe cuidadosamente as cores REAIS nos screenshots (barra superior, cabeçalho, fundo principal, faixas de destaque, cor real dos botões de compra e cor real do rodapé). Corrija qualquer erro da extração CSS caso o screenshot mostre outra cor dominante da marca.
2. ESTRUTURA & TIPOGRAFIA: Escolha o par de fontes Google, arredondamento (radius), layout de cabeçalho, alinhamento e espaçamento de cards que melhor espelham a personalidade visual vista no screenshot (ex: boutique sofisticada -> Cormorant Garamond/Playfair + radius none/small; moderna/streetwear -> Anton/Montserrat + uppercase; clean/tech -> Poppins/Manrope + medium).
3. BANNERS: Classifique se o banner Hero principal já possui arte gráfica com texto ("artwork") ou se é foto limpa precisando de texto editorial ("editorial").
4. COPY & DIFERENCIAIS REAIS DA MARCA: Escreva 4 benefícios reais coerentes com o que a loja oferece (sem jargões genéricos) e 3 depoimentos realistas mencionando o tipo de produto real da marca.
5. DIAGNÓSTICO DE IDENTIDADE & CONVERSÃO: Traga de 2 a 3 insights práticos observados no screenshot do site original (um de identidade/paleta preservada e 1-2 sugestões de melhoria de contraste/CTA/UX com cor alternativa opcional para teste em 1 clique).

Retorne APENAS um JSON válido com esta estrutura exata:
{
  "niche": "string curta em PT-BR",
  "tone": "modern" | "luxury" | "vibrant" | "minimal" | "tech",
  "heroMode": "artwork" | "editorial",
  "bodyBackground": "#HEX real do fundo da loja",
  "headerBackground": "#HEX real do cabeçalho",
  "announcementBackground": "#HEX real da barra superior",
  "primaryBackground": "#HEX real da cor principal da marca",
  "secondaryBackground": "#HEX real do rodapé ou segunda cor da marca",
  "neutralBackground": "#HEX real das faixas neutras/alternadas (ex: bege, creme, cinza suave)",
  "btnPrimaryBackground": "#HEX real do botão de compra/CTA",
  "btnSecondaryOutline": true | false,
  "headingFont": ${ALLOWED_HEADING_FONTS.map((f) => `"${f}"`).join(" | ")},
  "bodyFont": ${ALLOWED_BODY_FONTS.map((f) => `"${f}"`).join(" | ")},
  "radius": "none" | "small" | "medium" | "large",
  "headerLayout": "layout-1" | "layout-2" | "layout-3",
  "headerPosition": "default" | "sticky" | "overlay",
  "categoryCase": "uppercase" | "capitalize" | "normal",
  "productCardAlign": "left" | "center" | "right",
  "productCardPaddingX": 8 | 16 | 24 | 40,
  "announcementText": "texto fiel ou refinado da barra superior (até 90 chars)",
  "moodSectionTitle": "título da seção de estilos/categorias",
  "slimHeadline": "frase curta comercial na voz da marca para o banner slim",
  "secondaryHeadline": "título para o banner secundário de campanha",
  "secondarySubheadline": "subtítulo de apoio persuasivo",
  "promoStripText": "frase institucional de impacto sobre a marca",
  "aboutText": "resumo institucional autêntico da loja (até 190 chars)",
  "showcase1Title": "título da vitrine 1",
  "showcase2Title": "título da vitrine 2",
  "buyButtonText": "Comprar" | "Comprar agora" | "Adicionar à sacola" | "Eu quero",
  "benefits": [
    { "icon": "truck" | "credit-card" | "shield-check" | "refresh-cw", "title": "curto", "subtitle": "curto" }
  ],
  "testimonials": [
    { "author": "Nome S.", "rating": 5, "comment": "depoimento natural coerente com o produto real da loja" }
  ],
  "insights": [
    {
      "category": "palette" | "contrast" | "banners" | "conversion",
      "severity": "info" | "suggestion",
      "title": "título curto do insight",
      "description": "explicação objetiva baseada no visual analisado",
      "suggestedCtaHex": "#HEX opcional quando houver sugestão de teste de cor CTA"
    }
  ]
}`;

  parts.push({ type: "text", text: prompt });

  // Uma única chamada, no modelo do usuário: sem troca silenciosa de modelo
  let friendlyAiError: string;
  const timeoutSignal = AbortSignal.timeout(AI_ARCHITECT.timeoutMs);
  try {
    const response = await generateText({
      model: userAi.model,
      messages: [{ role: "user", content: parts }],
      temperature: AI_ARCHITECT.temperature,
      abortSignal: options.signal ? AbortSignal.any([timeoutSignal, options.signal]) : timeoutSignal,
    });
    const text = response.text?.trim();
    if (!text) throw new Error("Resposta vazia da IA");

    const aiData = extractJsonObject(text);

    const bodyBg = normalizeHex(
      typeof aiData.bodyBackground === "string" ? aiData.bodyBackground : undefined,
      baseBlueprint.theme.bodyBackground
    );
    const bodyFg = ensureReadableForeground(bodyBg, baseBlueprint.theme.bodyForeground);

    const headerBg = normalizeHex(
      typeof aiData.headerBackground === "string" ? aiData.headerBackground : undefined,
      baseBlueprint.visualOverrides.header.background
    );
    const headerFg = ensureReadableForeground(headerBg, baseBlueprint.visualOverrides.header.foreground);

    const announcementBg = normalizeHex(
      typeof aiData.announcementBackground === "string" ? aiData.announcementBackground : undefined,
      baseBlueprint.visualOverrides.announcement.background
    );
    const announcementFg = ensureReadableForeground(
      announcementBg,
      baseBlueprint.visualOverrides.announcement.foreground
    );

    const primaryBg = normalizeHex(
      typeof aiData.primaryBackground === "string" ? aiData.primaryBackground : undefined,
      baseBlueprint.theme.primaryBackground
    );
    const primaryFg = ensureReadableForeground(primaryBg, baseBlueprint.theme.primaryForeground);

    const secondaryBg = normalizeHex(
      typeof aiData.secondaryBackground === "string" ? aiData.secondaryBackground : undefined,
      baseBlueprint.theme.secondaryBackground
    );
    const secondaryFg = ensureReadableForeground(secondaryBg, baseBlueprint.theme.secondaryForeground);
    const legalBg = darkenHex(secondaryBg, COLOR_DERIVATION.legalDarken);
    const legalFg = ensureReadableForeground(legalBg, secondaryFg);

    const neutralBg = normalizeHex(
      typeof aiData.neutralBackground === "string" ? aiData.neutralBackground : undefined,
      baseBlueprint.theme.neutralBackground
    );
    const neutralFg = ensureReadableForeground(neutralBg, baseBlueprint.theme.neutralForeground);

    const btnPrimaryBg = normalizeHex(
      typeof aiData.btnPrimaryBackground === "string" ? aiData.btnPrimaryBackground : undefined,
      primaryBg
    );
    const btnPrimaryFg = ensureReadableForeground(btnPrimaryBg, baseBlueprint.theme.btnPrimaryColor);

    const aiInsightsRaw = Array.isArray(aiData.insights) ? aiData.insights : [];
    const parsedAiInsights: DesignInsight[] = aiInsightsRaw
      .slice(0, 4)
      .map((item, idx): DesignInsight | null => {
        if (!item || typeof item !== "object") return null;
        const rec = item as Record<string, unknown>;
        const title = typeof rec.title === "string" ? rec.title.trim() : "";
        const description = typeof rec.description === "string" ? rec.description.trim() : "";
        if (!title || !description) return null;

        const category = ["palette", "contrast", "banners", "conversion"].includes(
          String(rec.category)
        )
          ? (rec.category as DesignInsight["category"])
          : "palette";
        const severity = rec.severity === "info" ? "info" : "suggestion";
        const sugHex =
          typeof rec.suggestedCtaHex === "string"
            ? normalizeHex(rec.suggestedCtaHex, "")
            : "";

        return {
          id: `ai-insight-${idx + 1}`,
          category,
          severity,
          title,
          description,
          ...(sugHex
            ? {
                actionLabel: `Aplicar CTA ${sugHex}`,
                suggestedThemePatch: {
                  btnPrimaryBackground: sugHex,
                  btnPrimaryColor: getContrastingForeground(sugHex),
                  buyBtnBackground: sugHex,
                  buyBtnForeground: getContrastingForeground(sugHex),
                },
              }
            : {}),
        };
      })
      .filter((x): x is DesignInsight => x !== null);

    const finalInsights: DesignInsight[] = [
      {
        id: "ai-visual-analysis-badge",
        category: "palette",
        severity: "info",
        title: `Identidade visual analisada por ${model}`,
        description: `O modelo multimodal analisou ${attachedScreenshots > 0 ? `${attachedScreenshots} captura(s) visual(is)` : "os dados"} da loja original para calibrar paleta, tipografia, espaçamento e tom de voz no Tema LIME.`,
      },
      ...parsedAiInsights,
    ];

    const rawBenefits = Array.isArray(aiData.benefits) ? aiData.benefits : [];
    const parsedBenefits = rawBenefits
      .slice(0, 4)
      .map((b) => {
        if (!b || typeof b !== "object") return null;
        const rec = b as Record<string, unknown>;
        if (typeof rec.title !== "string" || typeof rec.subtitle !== "string") return null;
        const icon = ["truck", "credit-card", "shield-check", "refresh-cw"].includes(
          String(rec.icon)
        )
          ? String(rec.icon)
          : "shield-check";
        return { icon, title: rec.title.slice(0, 32), subtitle: rec.subtitle.slice(0, 52) };
      })
      .filter((x): x is StoreBlueprint["sections"]["benefits"][number] => x !== null);

    const rawTestimonials = Array.isArray(aiData.testimonials) ? aiData.testimonials : [];
    const parsedTestimonials = rawTestimonials
      .slice(0, 3)
      .map((t) => {
        if (!t || typeof t !== "object") return null;
        const rec = t as Record<string, unknown>;
        if (typeof rec.author !== "string" || typeof rec.comment !== "string") return null;
        return {
          author: rec.author.slice(0, 40),
          rating: 5,
          comment: rec.comment.slice(0, 200),
        };
      })
      .filter((x): x is StoreBlueprint["sections"]["testimonials"][number] => x !== null);

    const heroMode = aiData.heroMode === "editorial" ? "editorial" : "artwork";
    const validRadius = ["none", "small", "medium", "large"].includes(String(aiData.radius))
      ? (aiData.radius as StoreBlueprint["theme"]["radius"])
      : baseBlueprint.theme.radius;
    const validHeaderLayout = ["layout-1", "layout-2", "layout-3"].includes(
      String(aiData.headerLayout)
    )
      ? (aiData.headerLayout as StoreBlueprint["theme"]["headerLayout"])
      : baseBlueprint.theme.headerLayout;
    const validHeaderPos = ["default", "sticky", "overlay"].includes(
      String(aiData.headerPosition)
    )
      ? (aiData.headerPosition as "default" | "sticky" | "overlay")
      : baseBlueprint.visualOverrides.header.position;
    const validCatCase = ["normal", "uppercase", "lowercase", "capitalize"].includes(
      String(aiData.categoryCase)
    )
      ? (aiData.categoryCase as "normal" | "uppercase" | "lowercase" | "capitalize")
      : baseBlueprint.visualOverrides.header.categoryCase;
    const validAlign = ["left", "center", "right"].includes(String(aiData.productCardAlign))
      ? (aiData.productCardAlign as "left" | "center" | "right")
      : baseBlueprint.visualOverrides.productCard.titleAlign;
    const validPadding = [8, 16, 24, 40].includes(Number(aiData.productCardPaddingX))
      ? (Number(aiData.productCardPaddingX) as 8 | 16 | 24 | 40)
      : baseBlueprint.visualOverrides.productCard.paddingX;

    const merged: StoreBlueprint = {
      ...baseBlueprint,
      brand: {
        ...baseBlueprint.brand,
        niche: typeof aiData.niche === "string" ? aiData.niche : baseBlueprint.brand.niche,
        tone: ["modern", "luxury", "vibrant", "minimal", "tech"].includes(String(aiData.tone))
          ? (aiData.tone as StoreBlueprint["brand"]["tone"])
          : baseBlueprint.brand.tone,
      },
      theme: {
        ...baseBlueprint.theme,
        bodyBackground: bodyBg,
        bodyForeground: bodyFg,
        primaryBackground: primaryBg,
        primaryForeground: primaryFg,
        secondaryBackground: secondaryBg,
        secondaryForeground: secondaryFg,
        neutralBackground: neutralBg,
        neutralForeground: neutralFg,
        btnPrimaryBackground: btnPrimaryBg,
        btnPrimaryColor: btnPrimaryFg,
        btnSecondaryOutline:
          typeof aiData.btnSecondaryOutline === "boolean"
            ? aiData.btnSecondaryOutline
            : baseBlueprint.theme.btnSecondaryOutline,
        // Só aceita fontes suportadas; qualquer outra mantém a fonte da heurística.
        headingFont: matchAllowedFont(aiData.headingFont, ALLOWED_FONTS) ?? baseBlueprint.theme.headingFont,
        bodyFont: matchAllowedFont(aiData.bodyFont, ALLOWED_FONTS) ?? baseBlueprint.theme.bodyFont,
        radius: validRadius,
        headerLayout: validHeaderLayout,
      },
      visualOverrides: {
        ...baseBlueprint.visualOverrides,
        announcement: {
          background: announcementBg,
          foreground: announcementFg,
        },
        header: {
          ...baseBlueprint.visualOverrides.header,
          background: headerBg,
          foreground: headerFg,
          position: validHeaderPos,
          categoryCase: validCatCase,
        },
        productCard: {
          ...baseBlueprint.visualOverrides.productCard,
          titleAlign: validAlign,
          paddingX: validPadding,
          cardBackground: bodyBg,
          priceColor: bodyFg,
          buyBtnBackground: btnPrimaryBg,
          buyBtnForeground: btnPrimaryFg,
        },
        pageProduct: {
          ...baseBlueprint.visualOverrides.pageProduct,
          buyButtonText:
            typeof aiData.buyButtonText === "string"
              ? aiData.buyButtonText
              : baseBlueprint.visualOverrides.pageProduct.buyButtonText,
        },
        footer: {
          ...baseBlueprint.visualOverrides.footer,
          background: secondaryBg,
          foreground: secondaryFg,
          legalBackground: legalBg,
          legalForeground: legalFg,
        },
      },
      sections: {
        ...baseBlueprint.sections,
        announcementText:
          typeof aiData.announcementText === "string"
            ? aiData.announcementText
            : baseBlueprint.sections.announcementText,
        heroSlides: baseBlueprint.sections.heroSlides.map((s, idx) =>
          idx === 0 ? { ...s, mode: heroMode } : s
        ),
        benefitsBanner: baseBlueprint.sections.benefitsBanner
          ? {
              ...baseBlueprint.sections.benefitsBanner,
              backgroundColor:
                baseBlueprint.sections.benefitsBanner.mode === "site-images"
                  ? baseBlueprint.sections.benefitsBanner.backgroundColor
                  : neutralBg,
              textColor:
                baseBlueprint.sections.benefitsBanner.mode === "site-images"
                  ? baseBlueprint.sections.benefitsBanner.textColor
                  : neutralFg,
            }
          : undefined,
        moodSectionTitle:
          typeof aiData.moodSectionTitle === "string"
            ? aiData.moodSectionTitle
            : baseBlueprint.sections.moodSectionTitle,
        slimBanner: baseBlueprint.sections.slimBanner
          ? {
              ...baseBlueprint.sections.slimBanner,
              headline:
                typeof aiData.slimHeadline === "string"
                  ? aiData.slimHeadline
                  : baseBlueprint.sections.slimBanner.headline,
              backgroundColor: secondaryBg,
              textColor: secondaryFg,
            }
          : undefined,
        secondaryBanner: baseBlueprint.sections.secondaryBanner
          ? {
              ...baseBlueprint.sections.secondaryBanner,
              headline:
                typeof aiData.secondaryHeadline === "string"
                  ? aiData.secondaryHeadline
                  : baseBlueprint.sections.secondaryBanner.headline,
              subheadline:
                typeof aiData.secondarySubheadline === "string"
                  ? aiData.secondarySubheadline
                  : baseBlueprint.sections.secondaryBanner.subheadline,
              backgroundColor: secondaryBg,
              textColor: secondaryFg,
            }
          : undefined,
        promoStripText:
          typeof aiData.promoStripText === "string"
            ? aiData.promoStripText
            : baseBlueprint.sections.promoStripText,
        benefits: parsedBenefits.length >= 3 ? parsedBenefits : baseBlueprint.sections.benefits,
        // Depoimentos vindos da IA também são inventados: continuam ilustrativos.
        testimonialsIllustrative: true,
        testimonials:
          parsedTestimonials.length >= 2
            ? parsedTestimonials
            : baseBlueprint.sections.testimonials,
        showcases: baseBlueprint.sections.showcases.map((sc, idx) => {
          if (idx === 0 && typeof aiData.showcase1Title === "string") {
            return { ...sc, title: aiData.showcase1Title };
          }
          if (idx === 1 && typeof aiData.showcase2Title === "string") {
            return { ...sc, title: aiData.showcase2Title };
          }
          return sc;
        }),
      },
      footer: {
        ...baseBlueprint.footer,
        aboutText:
          typeof aiData.aboutText === "string"
            ? aiData.aboutText
            : baseBlueprint.footer.aboutText,
      },
      designInsights: finalInsights,
    };

    const validated = StoreBlueprintSchema.parse(merged);
    return { blueprint: validated, mode: "ai", aiProvider: userAi.provider, modelUsed: model };
  } catch (err) {
    // Só a mensagem fixa vai para o log: o texto cru do provedor pode ecoar a chave
    friendlyAiError = describeAiError(timeoutSignal.aborted ? { name: "TimeoutError" } : err);
    console.warn(`[architect] Falha na IA (${userAi.provider}/${model}):`, friendlyAiError);
  }

  // Fallback with transparent diagnostic insight (never fail silently)
  const fallbackWithNotice: StoreBlueprint = {
    ...baseBlueprint,
    designInsights: [
      {
        id: "ai-fallback-notice",
        category: "palette",
        severity: "suggestion",
        title: "Fallback heurístico ativado (IA indisponível)",
        description: `Não foi possível concluir a análise visual com IA nesta tentativa: ${friendlyAiError} Clique em "Reanalisar identidade com IA" para tentar novamente sem raspar o site do zero.`,
      },
      ...baseBlueprint.designInsights,
    ],
  };

  return {
    blueprint: fallbackWithNotice,
    mode: "heuristic",
    aiError: friendlyAiError,
  };
}
