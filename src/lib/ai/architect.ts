import fs from "node:fs/promises";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
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
  StoreBlueprintSchema,
  type DesignInsight,
  type ExtractedStoreData,
  type StoreBlueprint,
} from "@/lib/types/blueprint";

const IRROBA_FONT_PAIRINGS = [
  { heading: "Cormorant Garamond", body: "Jost", niches: ["moda", "boutique", "joia", "decoracao", "luxo"] },
  { heading: "Playfair Display", body: "Lora", niches: ["beleza", "cosmetico", "perfum", "artesanal"] },
  { heading: "Montserrat", body: "Poppins", niches: ["calcado", "vegano", "fitness", "suplemento", "esporte"] },
  { heading: "Oswald", body: "Cabin", niches: ["tech", "eletronico", "gamer", "ferramenta", "auto"] },
  { heading: "Poppins", body: "Poppins", niches: ["geral"] },
];

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

  if (/vegano|vegan|sustent|eco|organic|natural|vegetal/.test(haystack)) {
    return { niche: "Moda & Calçados Veganos", tone: "minimal" };
  }
  if (/bota|tenis|sapato|sandalia|calcado|bolsa|moda|vestido|roupa|camisa|coturno/.test(haystack)) {
    return { niche: "Moda & Calçados", tone: "modern" };
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

  const knownSystemFonts = [
    "arial",
    "helvetica",
    "sans-serif",
    "serif",
    "system-ui",
    "-apple-system",
    "times new roman",
  ];
  const hasGoodHeading = rawHeading && !knownSystemFonts.includes(rawHeading.toLowerCase());
  const hasGoodBody = rawBody && !knownSystemFonts.includes(rawBody.toLowerCase());

  if (hasGoodHeading && hasGoodBody) {
    return { heading: rawHeading, body: rawBody };
  }

  if (tone === "luxury") return IRROBA_FONT_PAIRINGS[0];
  if (tone === "minimal") return IRROBA_FONT_PAIRINGS[2];
  if (tone === "tech") return IRROBA_FONT_PAIRINGS[3];
  return IRROBA_FONT_PAIRINGS[2];
}

function mapBorderRadius(px: number | undefined): StoreBlueprint["theme"]["radius"] {
  if (px === undefined || px <= 2) return "none";
  if (px <= 6) return "small";
  if (px <= 14) return "medium";
  return "large";
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
  if (btnContrast < 4.5) {
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
      description: `A loja original usa paleta monocromática (${theme.primaryBackground}) nos botões principais. Isso mantém sobriedade, mas em testes A/B de e-commerce um botão de compra em destaque (ex: Verde Conversão #0F766E ou Terracota #C2410C) costuma elevar o CTR no mobile.`,
      actionLabel: "Testar botão Verde Conversão",
      suggestedThemePatch: {
        btnPrimaryBackground: "#0F766E",
        btnPrimaryColor: "#FFFFFF",
        buyBtnBackground: "#0F766E",
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
  const bodyBackground = normalizeHex(extracted.tokens.bodyBackground, "#FFFFFF");
  const bodyForeground = normalizeHex(
    extracted.tokens.bodyForeground,
    getContrastingForeground(bodyBackground)
  );

  const headerBackground = normalizeHex(extracted.tokens.headerBackground, bodyBackground);
  const headerForeground = normalizeHex(
    extracted.tokens.headerForeground,
    getContrastingForeground(headerBackground)
  );

  const primaryBackground = normalizeHex(
    extracted.tokens.primaryButtonBg ?? extracted.tokens.accentColor ?? extracted.tokens.announcementBackground,
    "#111827"
  );
  const primaryForeground = normalizeHex(
    extracted.tokens.primaryButtonColor,
    getContrastingForeground(primaryBackground)
  );

  // Secondary / Footer background: strictly follow extracted footer/secondary, NO green fallback!
  const rawFooterBg = normalizeHex(
    extracted.tokens.footerBackground ?? extracted.tokens.secondaryButtonBg,
    isLightColor(primaryBackground) ? "#18181B" : darkenHex(primaryBackground, 0.2)
  );
  const secondaryBackground = rawFooterBg === bodyBackground ? "#18181B" : rawFooterBg;
  const secondaryForeground = normalizeHex(
    extracted.tokens.footerForeground,
    getContrastingForeground(secondaryBackground)
  );

  // Neutral surface: use real extracted surface section color (e.g. beige/cream/light gray), NEVER tinted green
  const rawSurface = normalizeHex(extracted.tokens.surfaceBackground, "");
  const neutralBackground =
    rawSurface && rawSurface !== bodyBackground && isLightColor(rawSurface)
      ? rawSurface
      : isNearWhiteOrBlack(primaryBackground)
        ? "#F4F4F5"
        : lightenHex(primaryBackground, 0.92);
  const neutralForeground = getContrastingForeground(neutralBackground);

  const announcementBackground = normalizeHex(
    extracted.tokens.announcementBackground,
    isLightColor(primaryBackground) ? "#111827" : primaryBackground
  );
  const announcementForeground = normalizeHex(
    extracted.tokens.announcementForeground,
    getContrastingForeground(announcementBackground)
  );

  const btnSecondaryBg = normalizeHex(extracted.tokens.secondaryButtonBg, "#111827");
  const btnSecondaryFg = normalizeHex(
    extracted.tokens.secondaryButtonColor,
    getContrastingForeground(btnSecondaryBg)
  );

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
          category: p.category || "Destaques",
          categories: p.categories && p.categories.length > 0 ? p.categories : [p.category || "Destaques"],
          installmentsText: `em até 6x de R$ ${(p.price / 6).toFixed(2).replace(".", ",")} sem juros`,
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
              "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
            images: [
              extracted.banners[0]?.imageUrl ||
                "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
            ],
            category: "Destaques",
            categories: ["Destaques"],
            installmentsText: "em até 6x de R$ 33,31 sem juros",
            description: "Item de demonstração para apresentação de layout personalizado na Irroba.",
            visible: true,
          },
        ];

  const half = Math.ceil(fallbackProducts.length / 2);
  const firstShowcaseIds = fallbackProducts.slice(0, Math.min(8, half)).map((p) => p.id);
  const secondShowcaseIds = fallbackProducts.slice(half, half + 8).map((p) => p.id);

  const showcases: StoreBlueprint["sections"]["showcases"] = [
    {
      title: pickSectionHeading(
        extracted.sectionHeadings,
        /destaqu|preferid|best|mais vendid|cole/i,
        "Destaques da Coleção"
      ),
      subtitle: "Os favoritos dos nossos clientes com entrega para todo o Brasil",
      productIds: firstShowcaseIds.length > 0 ? firstShowcaseIds : fallbackProducts.map((p) => p.id),
    },
  ];
  if (secondShowcaseIds.length > 0) {
    showcases.push({
      title: pickSectionHeading(
        extracted.sectionHeadings,
        /lançament|novidad|ofert|promo/i,
        "Mais Procurados & Novidades"
      ),
      subtitle: "Seleção especial com pagamento facilitado no PIX e cartão",
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
          siteImageUrls: benefitsExtracted.slice(0, 6).map((b) => b.imageUrl),
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
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1400&q=80";

  const heroSlides: StoreBlueprint["sections"]["heroSlides"] =
    heroExtracted.length > 0
      ? heroExtracted.slice(0, 3).map((b, idx) => ({
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
      ? extracted.categories.slice(0, 8).map((cat, idx) => {
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
    moodExtracted.length >= 2
      ? moodExtracted.slice(0, 4).map((m, idx) => ({
          id: `mood-${idx + 1}`,
          title: m.label || categories[idx]?.label || `Coleção ${idx + 1}`,
          subtitle: "Explorar seleção",
          imageUrl: m.imageUrl,
          href: "#vitrines",
          enabled: true,
        }))
      : categories.slice(0, 4).map((c, idx) => ({
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
        badgeText: "CAMPANHA",
        headline: slimExtracted.alt || `Condições especiais na ${extracted.storeName}`,
        ctaText: "Conferir",
        backgroundColor: secondaryBackground,
        textColor: secondaryForeground,
      }
    : {
        enabled: true,
        mode: "designed",
        imageUrl: "",
        badgeText: "VANTAGEM EXCLUSIVA",
        headline:
          extracted.announcementText ||
          `5% OFF no PIX + Parcele em até 6x sem juros na ${extracted.storeName}`,
        ctaText: "Aproveitar Agora",
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
    headerLayout: "layout-1",
  };

  const designInsights = buildDesignInsights(
    extracted,
    theme,
    heroExtracted.length,
    (slimExtracted ? 1 : 0) + (secondaryExtracted ? 1 : 0)
  );

  return {
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
        backgroundOpacity: 0.98,
        blurPx: 8,
        highContrastLogoOnHover: false,
        categoryCase: "uppercase",
      },
      banner: {
        width: "full",
      },
      productCard: {
        listWidth: "container",
        titleAlign: "center",
        cardBackground: bodyBackground,
        paddingX: 16,
        buyBtnBackground: primaryBackground,
        buyBtnForeground: primaryForeground,
        buyBtnBorder: "transparent",
        priceColor: bodyForeground,
        oldPriceColor: "#9CA3AF",
      },
      pageProduct: {
        galleryOrientation: "vertical",
        buyButtonText: "Comprar agora",
      },
      footer: {
        width: "container",
        background: secondaryBackground,
        foreground: secondaryForeground,
        legalBackground: darkenHex(secondaryBackground, 0.25),
        legalForeground: secondaryForeground,
      },
    },
    sections: {
      announcementText:
        extracted.announcementText ||
        "Frete Grátis em compras selecionadas • 5% OFF no PIX • Parcele em até 6x sem juros",
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
        /mood|estilo|categoria|cole/i,
        "Explore por Estilo & Categoria"
      ),
      moodBanners,
      secondaryBanner,
      promoStripText: `Conheça a nova loja ${extracted.storeName} preparada para escalar vendas`,
      benefits: [
        { icon: "truck", title: "Envio Rápido", subtitle: "Para todo o Brasil com rastreio" },
        { icon: "credit-card", title: "Até 6x Sem Juros", subtitle: "Ou desconto especial no PIX" },
        { icon: "shield-check", title: "Compra 100% Segura", subtitle: "Checkout transparente protegido" },
        { icon: "refresh-cw", title: "Troca Facilitada", subtitle: "Primeira troca simples e rápida" },
      ],
      showcases,
      testimonialsTitle: pickSectionHeading(
        extracted.sectionHeadings,
        /dissemos|dizem|avalia|depoiment|cliente/i,
        "Quem compra recomenda"
      ),
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
        `${extracted.storeName} — Loja virtual estruturada com foco em identidade de marca, agilidade e alta conversão.`,
      whatsapp: extracted.contacts.whatsapp,
      instagram: extracted.contacts.instagram,
      email: extracted.contacts.email,
    },
    designInsights,
  };
}

export async function buildStoreBlueprint(
  extracted: ExtractedStoreData
): Promise<{ blueprint: StoreBlueprint; mode: "gemini" | "heuristic" }> {
  const baseBlueprint = buildHeuristicBlueprint(extracted);
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return { blueprint: baseBlueprint, mode: "heuristic" };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    for (const imgPath of [extracted.screenshotPath, extracted.fullScreenshotPath]) {
      if (!imgPath) continue;
      const filename = path.basename(imgPath);
      const diskPath = path.join(process.cwd(), "public", "captures", filename);
      try {
        const imgBuffer = await fs.readFile(diskPath);
        parts.push({
          inlineData: {
            mimeType: "image/png",
            data: imgBuffer.toString("base64"),
          },
        });
      } catch {
        // Skip unavailable captures
      }
    }

    const prompt = `Você é um Diretor de E-commerce e Brand Designer da plataforma Irroba (Tema LIME).
Sua prioridade absoluta é FIDELIDADE À IDENTIDADE DA MARCA analisando os screenshots e dados da loja "${extracted.storeName}" (${extracted.detectedPlatform}).

Dados extraídos:
- Categorias do menu: ${extracted.categories.map((c) => c.label).join(", ") || "Nenhuma"}
- Títulos de seções encontrados no site: ${extracted.sectionHeadings.join(" | ") || "Nenhum"}
- Amostra de produtos: ${extracted.products
      .slice(0, 8)
      .map((p) => `${p.title} (R$ ${p.price.toFixed(2)})`)
      .join(" | ")}
- Paleta fiel extraída: primary=${baseBlueprint.theme.primaryBackground}, secondary=${baseBlueprint.theme.secondaryBackground}, neutral=${baseBlueprint.theme.neutralBackground}, body=${baseBlueprint.theme.bodyBackground}

Instruções:
1. Mantenha a paleta fiel ao screenshot original (só sugira ajustes em "paletteSuggestion" se houver problema real de contraste ou oportunidade clara de conversão).
2. Classifique se o banner Hero principal já possui arte/texto gráfico ("artwork") ou se é foto limpa que precisa de texto sobreposto ("editorial").
3. Adapte os títulos das seções (vitrines, mood, slim banner, banner secundário) para refletir exatamente o tom de voz da marca.

Retorne APENAS JSON válido neste formato:
{
  "niche": "string curta em PT-BR",
  "tone": "modern" | "luxury" | "vibrant" | "minimal" | "tech",
  "heroMode": "artwork" | "editorial",
  "primaryBackground": "#HEX fiel ao site",
  "secondaryBackground": "#HEX fiel ao rodapé/destaque do site",
  "neutralBackground": "#HEX fiel às faixas neutras do site",
  "headingFont": "Cormorant Garamond" | "Playfair Display" | "Montserrat" | "Poppins" | "Oswald" | "Anton",
  "bodyFont": "Jost" | "Lora" | "Poppins" | "Cabin" | "Roboto" | "Manrope",
  "announcementText": "texto fiel ou refinado com até 90 chars",
  "moodSectionTitle": "título da seção de estilos/categorias",
  "slimHeadline": "frase curta para banner horizontal",
  "secondaryHeadline": "título para banner de campanha intermediário",
  "secondarySubheadline": "subtítulo de apoio",
  "showcase1Title": "título da vitrine 1",
  "showcase2Title": "título da vitrine 2",
  "buyButtonText": "Comprar" | "Comprar agora" | "Adicionar à sacola",
  "paletteSuggestionTitle": "título curto de sugestão de melhoria de cor/UX (opcional)",
  "paletteSuggestionDesc": "explicação prática da sugestão (opcional)",
  "suggestedCtaHex": "#HEX opcional de CTA alternativo para teste"
}`;

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: parts,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const text = response.text?.trim();
    if (!text) return { blueprint: baseBlueprint, mode: "heuristic" };

    const aiData = JSON.parse(text) as Record<string, unknown>;
    const primaryBg = normalizeHex(
      typeof aiData.primaryBackground === "string" ? aiData.primaryBackground : undefined,
      baseBlueprint.theme.primaryBackground
    );
    const primaryFg = getContrastingForeground(primaryBg);
    const secondaryBg = normalizeHex(
      typeof aiData.secondaryBackground === "string" ? aiData.secondaryBackground : undefined,
      baseBlueprint.theme.secondaryBackground
    );
    const secondaryFg = getContrastingForeground(secondaryBg);
    const neutralBg = normalizeHex(
      typeof aiData.neutralBackground === "string" ? aiData.neutralBackground : undefined,
      baseBlueprint.theme.neutralBackground
    );
    const neutralFg = getContrastingForeground(neutralBg);

    const extraInsights = [...baseBlueprint.designInsights];
    if (
      typeof aiData.paletteSuggestionTitle === "string" &&
      typeof aiData.paletteSuggestionDesc === "string"
    ) {
      const sugHex =
        typeof aiData.suggestedCtaHex === "string"
          ? normalizeHex(aiData.suggestedCtaHex, "")
          : "";
      extraInsights.unshift({
        id: "gemini-brand-insight",
        category: "palette",
        severity: "suggestion",
        title: aiData.paletteSuggestionTitle,
        description: aiData.paletteSuggestionDesc,
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
      });
    }

    const heroMode = aiData.heroMode === "editorial" ? "editorial" : "artwork";

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
        primaryBackground: primaryBg,
        primaryForeground: primaryFg,
        secondaryBackground: secondaryBg,
        secondaryForeground: secondaryFg,
        neutralBackground: neutralBg,
        neutralForeground: neutralFg,
        btnPrimaryBackground: primaryBg,
        btnPrimaryColor: primaryFg,
        headingFont:
          typeof aiData.headingFont === "string"
            ? aiData.headingFont
            : baseBlueprint.theme.headingFont,
        bodyFont:
          typeof aiData.bodyFont === "string" ? aiData.bodyFont : baseBlueprint.theme.bodyFont,
      },
      visualOverrides: {
        ...baseBlueprint.visualOverrides,
        productCard: {
          ...baseBlueprint.visualOverrides.productCard,
          buyBtnBackground: primaryBg,
          buyBtnForeground: primaryFg,
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
          legalBackground: darkenHex(secondaryBg, 0.25),
          legalForeground: secondaryFg,
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
            }
          : undefined,
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
      designInsights: extraInsights,
    };

    const validated = StoreBlueprintSchema.parse(merged);
    return { blueprint: validated, mode: "gemini" };
  } catch {
    return { blueprint: baseBlueprint, mode: "heuristic" };
  }
}
