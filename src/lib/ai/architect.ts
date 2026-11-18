import fs from "node:fs/promises";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import {
  darkenHex,
  getContrastingForeground,
  isNearWhiteOrBlack,
  lightenHex,
  normalizeHex,
} from "./color-utils";
import { sanitizeFontName } from "@/lib/irroba-blocks/sanitize";
import {
  StoreBlueprintSchema,
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
    return { niche: "Moda & Calçados Sustentáveis", tone: "minimal" };
  }
  if (/bota|tenis|sapato|sandalia|calcado|bolsa|moda|vestido|roupa|camisa/.test(haystack)) {
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

  const knownSystemFonts = ["arial", "helvetica", "sans-serif", "serif", "system-ui", "-apple-system", "times new roman"];
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

export function buildHeuristicBlueprint(extracted: ExtractedStoreData): StoreBlueprint {
  const { niche, tone } = inferNicheAndTone(extracted);
  const fonts = pickFontPairing(extracted, tone);

  const rawBodyBg = normalizeHex(extracted.tokens.bodyBackground, "#FFFFFF");
  const bodyBackground = isNearWhiteOrBlack(rawBodyBg) && rawBodyBg !== "#000000" ? "#FFFFFF" : rawBodyBg;
  const bodyForeground = getContrastingForeground(bodyBackground);

  const rawPrimary = normalizeHex(
    extracted.tokens.primaryButtonBg ?? extracted.tokens.headerBackground,
    "#026526"
  );
  const primaryBackground =
    rawPrimary === bodyBackground ? "#026526" : rawPrimary;
  const primaryForeground = getContrastingForeground(primaryBackground);

  const secondaryBackground = isNearWhiteOrBlack(primaryBackground)
    ? "#026526"
    : darkenHex(primaryBackground, 0.35);
  const secondaryForeground = getContrastingForeground(secondaryBackground);

  const neutralBackground = lightenHex(primaryBackground, 0.92);
  const neutralForeground = "#111827";

  const radius = mapBorderRadius(extracted.tokens.borderRadiusPx);

  const fallbackProducts: StoreBlueprint["products"] =
    extracted.products.length > 0
      ? extracted.products.map((p) => ({
          id: p.id,
          title: p.title,
          price: p.price,
          compareAtPrice: p.compareAtPrice,
          imageUrl: p.imageUrl,
          category: p.category || "Destaques",
          installmentsText: `em até 6x de R$ ${(p.price / 6).toFixed(2).replace(".", ",")} sem juros`,
          description:
            p.description ||
            `${p.title} selecionado especialmente para você na nova loja ${extracted.storeName} na plataforma Irroba.`,
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
            category: "Destaques",
            installmentsText: "em até 6x de R$ 33,31 sem juros",
            description: "Item de demonstração para apresentação de layout personalizado na Irroba.",
          },
        ];

  const half = Math.ceil(fallbackProducts.length / 2);
  const firstShowcaseIds = fallbackProducts.slice(0, Math.min(8, half)).map((p) => p.id);
  const secondShowcaseIds = fallbackProducts.slice(half, half + 8).map((p) => p.id);

  const showcases: StoreBlueprint["sections"]["showcases"] = [
    {
      title: "Destaques da Coleção",
      subtitle: "Os favoritos dos nossos clientes com entrega para todo o Brasil",
      productIds: firstShowcaseIds.length > 0 ? firstShowcaseIds : fallbackProducts.map((p) => p.id),
    },
  ];
  if (secondShowcaseIds.length > 0) {
    showcases.push({
      title: "Mais Procurados & Novidades",
      subtitle: "Seleção especial com pagamento facilitado no PIX e cartão",
      productIds: secondShowcaseIds,
    });
  }

  const heroImage =
    extracted.banners[0]?.imageUrl ||
    fallbackProducts[0]?.imageUrl ||
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1400&q=80";

  const categories =
    extracted.categories.length > 0
      ? extracted.categories.slice(0, 7).map((cat, idx) => ({
          label: cat.label,
          href: `#cat-${idx + 1}`,
          imageUrl: fallbackProducts[idx % fallbackProducts.length]?.imageUrl,
        }))
      : [
          { label: "Novidades", href: "#novidades", imageUrl: fallbackProducts[0]?.imageUrl },
          { label: "Mais Vendidos", href: "#mais-vendidos", imageUrl: fallbackProducts[0]?.imageUrl },
          { label: "Ofertas", href: "#ofertas", imageUrl: fallbackProducts[0]?.imageUrl },
        ];

  return {
    brand: {
      name: extracted.storeName,
      logoUrl: extracted.logoUrl || extracted.faviconUrl || "",
      niche,
      tone,
    },
    theme: {
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
      btnSecondaryBackground: "#111827",
      btnSecondaryColor: "#FFFFFF",
      btnSecondaryOutline: true,
      headingFont: fonts.heading,
      bodyFont: fonts.body,
      radius,
      headerLayout: "layout-1",
    },
    visualOverrides: {
      header: {
        position: extracted.tokens.headerIsOverlay ? "sticky" : "default",
        expanded: true,
        gradientTransition: false,
        backgroundOpacity: 0.96,
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
        cardBackground: "#FFFFFF",
        paddingX: 16,
        buyBtnBackground: primaryBackground,
        buyBtnForeground: primaryForeground,
      },
      pageProduct: {
        galleryOrientation: "vertical",
        buyButtonText: "Comprar agora",
      },
      footer: {
        width: "container",
        background: secondaryBackground,
        legalBackground: darkenHex(secondaryBackground, 0.25),
        legalForeground: "#FFFFFF",
      },
    },
    sections: {
      announcementText: "Frete Grátis em compras selecionadas • 5% OFF no PIX • Parcele em até 6x sem juros",
      categories,
      hero: {
        headline: `${extracted.storeName}: nova experiência de compra`,
        subheadline:
          extracted.description?.slice(0, 130) ||
          "Navegação mais rápida, vitrine inteligente e checkout transparente pensado para converter mais.",
        ctaText: "Ver Coleção",
        imageUrl: heroImage,
      },
      promoStripText: `Conheça a nova loja ${extracted.storeName} preparada para escalar vendas`,
      benefits: [
        { icon: "truck", title: "Envio Rápido", subtitle: "Para todo o Brasil com rastreio" },
        { icon: "credit-card", title: "Até 6x Sem Juros", subtitle: "Ou desconto especial no PIX" },
        { icon: "shield-check", title: "Compra 100% Segura", subtitle: "Checkout transparente protegido" },
        { icon: "refresh-cw", title: "Troca Facilitada", subtitle: "Primeira troca simples e rápida" },
      ],
      showcases,
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
        extracted.description?.slice(0, 180) ||
        `${extracted.storeName} — Loja virtual estruturada com foco em experiência do cliente, agilidade e alta conversão.`,
      whatsapp: extracted.contacts.whatsapp,
      instagram: extracted.contacts.instagram,
      email: extracted.contacts.email,
    },
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

    if (extracted.screenshotPath) {
      const diskPath = path.join(process.cwd(), "public", extracted.screenshotPath.replace(/^\/+/, ""));
      try {
        const imgBuffer = await fs.readFile(diskPath);
        parts.push({
          inlineData: {
            mimeType: "image/png",
            data: imgBuffer.toString("base64"),
          },
        });
      } catch {
        // Proceed with text-only context if screenshot file is unavailable
      }
    }

    const prompt = `Você é um Diretor de E-commerce e UI/UX da plataforma Irroba (Tema LIME).
Analise o screenshot e os dados extraídos da loja "${extracted.storeName}" (${extracted.detectedPlatform}) para gerar refinamentos de design e copywriting de alta conversão em JSON.

Dados extraídos:
- Categorias: ${extracted.categories.map((c) => c.label).join(", ") || "Nenhuma"}
- Produtos (amostra): ${extracted.products
      .slice(0, 8)
      .map((p) => `${p.title} (R$ ${p.price.toFixed(2)})`)
      .join(" | ")}
- Paleta base detectada: primary=${baseBlueprint.theme.primaryBackground}, bodyBg=${baseBlueprint.theme.bodyBackground}

Retorne APENAS um objeto JSON válido com esta estrutura exata:
{
  "niche": "string curta do nicho em PT-BR",
  "tone": "modern" | "luxury" | "vibrant" | "minimal" | "tech",
  "primaryBackground": "#HEX com bom contraste para botões e destaques da marca",
  "secondaryBackground": "#HEX complementar escuro para rodapé/contrastes",
  "headingFont": "Cormorant Garamond" | "Playfair Display" | "Montserrat" | "Poppins" | "Oswald",
  "bodyFont": "Jost" | "Lora" | "Poppins" | "Cabin" | "Roboto",
  "radius": "none" | "small" | "medium" | "large",
  "headerPosition": "default" | "sticky",
  "announcementText": "tarja curta de benefícios com no máximo 85 caracteres",
  "heroHeadline": "título impactante de no máximo 60 caracteres",
  "heroSubheadline": "subtítulo persuasivo de no máximo 130 caracteres",
  "heroCtaText": "CTA de 2 a 3 palavras",
  "promoStripText": "frase curta de destaque para faixa intermediária",
  "showcase1Title": "título da vitrine 1",
  "showcase2Title": "título da vitrine 2",
  "buyButtonText": "Comprar agora" | "Adicionar à sacola" | "Eu quero"
}`;

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: parts,
      config: {
        responseMimeType: "application/json",
        temperature: 0.4,
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
        neutralBackground: lightenHex(primaryBg, 0.92),
        btnPrimaryBackground: primaryBg,
        btnPrimaryColor: primaryFg,
        headingFont:
          typeof aiData.headingFont === "string" ? aiData.headingFont : baseBlueprint.theme.headingFont,
        bodyFont: typeof aiData.bodyFont === "string" ? aiData.bodyFont : baseBlueprint.theme.bodyFont,
        radius: ["none", "small", "medium", "large"].includes(String(aiData.radius))
          ? (aiData.radius as StoreBlueprint["theme"]["radius"])
          : baseBlueprint.theme.radius,
      },
      visualOverrides: {
        ...baseBlueprint.visualOverrides,
        header: {
          ...baseBlueprint.visualOverrides.header,
          position: aiData.headerPosition === "sticky" ? "sticky" : "default",
        },
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
          legalBackground: darkenHex(secondaryBg, 0.25),
        },
      },
      sections: {
        ...baseBlueprint.sections,
        announcementText:
          typeof aiData.announcementText === "string"
            ? aiData.announcementText
            : baseBlueprint.sections.announcementText,
        hero: {
          ...baseBlueprint.sections.hero,
          headline:
            typeof aiData.heroHeadline === "string"
              ? aiData.heroHeadline
              : baseBlueprint.sections.hero.headline,
          subheadline:
            typeof aiData.heroSubheadline === "string"
              ? aiData.heroSubheadline
              : baseBlueprint.sections.hero.subheadline,
          ctaText:
            typeof aiData.heroCtaText === "string"
              ? aiData.heroCtaText
              : baseBlueprint.sections.hero.ctaText,
        },
        promoStripText:
          typeof aiData.promoStripText === "string"
            ? aiData.promoStripText
            : baseBlueprint.sections.promoStripText,
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
    };

    const validated = StoreBlueprintSchema.parse(merged);
    return { blueprint: validated, mode: "gemini" };
  } catch {
    return { blueprint: baseBlueprint, mode: "heuristic" };
  }
}
