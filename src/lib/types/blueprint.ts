import { DEFAULT_COPY } from "@/lib/layout-patterns/copy";
import { z } from "zod";

export const ExtractedProductSchema = z.object({
  id: z.string().max(5000),
  title: z.string().max(5000),
  price: z.number().nonnegative(),
  compareAtPrice: z.number().nonnegative().optional(),
  imageUrl: z.string().max(4000000),
  images: z.array(z.string().max(4000000)).default([]),
  productUrl: z.string().max(4000000).optional(),
  category: z.string().max(5000).default("Destaques"),
  categories: z.array(z.string().max(5000)).default([]),
  description: z.string().max(5000).optional(),
  badge: z.string().max(200).optional(),
  sizes: z.array(z.string().max(200)).optional(),
});

export type ExtractedProduct = z.infer<typeof ExtractedProductSchema>;

export const ExtractedBannerSchema = z.object({
  imageUrl: z.string().max(4000000),
  alt: z.string().max(5000).optional(),
  href: z.string().max(5000).optional(),
  slot: z.enum(["hero", "slim", "secondary", "mood", "benefits"]).default("hero"),
  label: z.string().max(5000).optional(),
});

export type ExtractedBanner = z.infer<typeof ExtractedBannerSchema>;

export const ExtractedStoreDataSchema = z.object({
  sourceUrl: z.string().max(4000000),
  detectedPlatform: z.string().max(5000),
  storeName: z.string().max(5000),
  description: z.string().max(5000).optional(),
  logoUrl: z.string().max(4000000).optional(),
  faviconUrl: z.string().max(4000000).optional(),
  screenshotPath: z.string().max(5000).optional(),
  fullScreenshotPath: z.string().max(5000).optional(),
  mobileScreenshotPath: z.string().max(5000).optional(),
  mobileFullScreenshotPath: z.string().max(5000).optional(),
  tokens: z.object({
    bodyBackground: z.string().max(5000).optional(),
    bodyForeground: z.string().max(5000).optional(),
    surfaceBackground: z.string().max(5000).optional(),
    benefitsBackground: z.string().max(5000).optional(),
    announcementBackground: z.string().max(5000).optional(),
    announcementForeground: z.string().max(5000).optional(),
    headerBackground: z.string().max(5000).optional(),
    headerForeground: z.string().max(5000).optional(),
    headerIsOverlay: z.boolean().default(false),
    primaryButtonBg: z.string().max(5000).optional(),
    primaryButtonColor: z.string().max(5000).optional(),
    secondaryButtonBg: z.string().max(5000).optional(),
    secondaryButtonColor: z.string().max(5000).optional(),
    accentColor: z.string().max(5000).optional(),
    footerBackground: z.string().max(5000).optional(),
    footerForeground: z.string().max(5000).optional(),
    headingFont: z.string().max(5000).optional(),
    bodyFont: z.string().max(5000).optional(),
    borderRadiusPx: z.number().optional(),
  }),
  announcementText: z.string().max(5000).optional(),
  sectionHeadings: z.array(z.string().max(5000)).default([]),
  categories: z.array(
    z.object({
      label: z.string().max(5000),
      href: z.string().max(5000),
      imageUrl: z.string().max(4000000).optional(),
    })
  ),
  banners: z.array(ExtractedBannerSchema),
  products: z.array(ExtractedProductSchema),
  contacts: z.object({
    whatsapp: z.string().max(5000).optional(),
    instagram: z.string().max(5000).optional(),
    facebook: z.string().max(5000).optional(),
    email: z.string().max(5000).optional(),
    phone: z.string().max(5000).optional(),
    address: z.string().max(5000).optional(),
    cnpj: z.string().max(5000).optional(),
  }),
  /** Avisos da extração (ex.: nenhum produto/banner lido). */
  extractionWarnings: z.array(z.string().max(500)).optional(),
});

export type ExtractedStoreData = z.infer<typeof ExtractedStoreDataSchema>;

export const DesignInsightSchema = z.object({
  id: z.string().max(5000),
  category: z.enum(["palette", "contrast", "banners", "conversion"]),
  severity: z.enum(["info", "suggestion"]),
  title: z.string().max(5000),
  description: z.string().max(5000),
  actionLabel: z.string().max(5000).optional(),
  suggestedThemePatch: z
    .object({
      primaryBackground: z.string().max(5000).optional(),
      primaryForeground: z.string().max(5000).optional(),
      secondaryBackground: z.string().max(5000).optional(),
      secondaryForeground: z.string().max(5000).optional(),
      neutralBackground: z.string().max(5000).optional(),
      neutralForeground: z.string().max(5000).optional(),
      bodyForeground: z.string().max(5000).optional(),
      btnPrimaryBackground: z.string().max(5000).optional(),
      btnPrimaryColor: z.string().max(5000).optional(),
      buyBtnBackground: z.string().max(5000).optional(),
      buyBtnForeground: z.string().max(5000).optional(),
    })
    .optional(),
});

export type DesignInsight = z.infer<typeof DesignInsightSchema>;

export const HeroSlideSchema = z.object({
  id: z.string().max(5000),
  imageUrl: z.string().max(4000000),
  headline: z.string().max(5000),
  subheadline: z.string().max(5000),
  ctaText: z.string().max(5000),
  ctaHref: z.string().max(5000).default("#vitrines"),
  mode: z.enum(["artwork", "editorial"]).default("artwork"),
  enabled: z.boolean().default(true),
});

export const MoodBannerSchema = z.object({
  id: z.string().max(5000),
  title: z.string().max(5000),
  subtitle: z.string().max(5000).default(""),
  imageUrl: z.string().max(4000000),
  href: z.string().max(5000).default("#vitrines"),
  enabled: z.boolean().default(true),
});

export const SectionKeySchema = z.enum([
  "hero",
  "tarja",
  "editorialGallery",
  "slimBanner",
  "showcase1",
  "secondaryBanner",
  "editorialLookbook",
  "extraShowcases",
  "testimonials",
  "newsletter",
]);

export type SectionKey = z.infer<typeof SectionKeySchema>;

const BUILTIN_SECTION_KEYS = new Set<string>(SectionKeySchema.options);

export function isBuiltinSectionKey(id: string): id is SectionKey {
  return BUILTIN_SECTION_KEYS.has(id);
}

export const CustomSectionKindSchema = z.enum([
  "html",
  "banner",
  "slimBanner",
  "showcase",
  "gallery",
  "tarja",
  "editorialSplit",
]);

export type CustomSectionKind = z.infer<typeof CustomSectionKindSchema>;

export const CUSTOM_SECTION_MODULE_LABELS: Record<CustomSectionKind, string> = {
  html: "Conteúdo HTML",
  banner: "Banner Versão 2",
  slimBanner: "Banner Versão 2 (Slim)",
  showcase: "Listas de Produtos",
  gallery: "Conteúdo HTML · Galeria",
  tarja: "Tarja Informativa",
  editorialSplit: "Conteúdo HTML · Editorial",
};

export const CUSTOM_SECTION_TYPE_LABELS: Record<CustomSectionKind, string> = {
  html: "Bloco HTML Personalizado (IA)",
  banner: "Banner de Campanha",
  slimBanner: "Banner Slim Promocional",
  showcase: "Lista de Produtos / Vitrine",
  gallery: "Galeria de Cards",
  tarja: "Tarja de Benefícios",
  editorialSplit: "Bloco Editorial (Texto + Imagem)",
};

export const CustomHtmlSectionSchema = z.object({
  id: z.string().min(1).max(120),
  kind: z.literal("html"),
  title: z.string().max(5000),
  width: z.enum(["container", "full"]).default("full"),
  html: z.string().max(150000),
});

export const CustomBannerSectionSchema = z.object({
  id: z.string().min(1).max(120),
  kind: z.literal("banner"),
  title: z.string().max(5000),
  mode: z.enum(["artwork", "editorial"]).default("editorial"),
  imageUrl: z.string().max(4000000).default(""),
  headline: z.string().max(5000).default(""),
  subheadline: z.string().max(5000).default(""),
  ctaText: z.string().max(5000).default("Ver Coleção"),
  ctaHref: z.string().max(5000).default("#vitrines"),
  backgroundColor: z.string().max(5000).optional(),
  textColor: z.string().max(5000).optional(),
  heightPx: z.number().min(120).max(1000).optional(),
  widthPx: z.number().min(280).max(2560).optional(),
  objectFit: z.enum(["cover", "contain", "fill"]).optional(),
});

export const CustomSlimBannerSectionSchema = z.object({
  id: z.string().min(1).max(120),
  kind: z.literal("slimBanner"),
  title: z.string().max(5000),
  mode: z.enum(["image", "designed"]).default("designed"),
  imageUrl: z.string().max(4000000).default(""),
  badgeText: z.string().max(5000).default("DESTAQUE"),
  headline: z.string().max(5000).default(""),
  ctaText: z.string().max(5000).default("Aproveitar"),
  backgroundColor: z.string().max(5000).optional(),
  textColor: z.string().max(5000).optional(),
  heightPx: z.number().min(40).max(600).optional(),
  widthPx: z.number().min(280).max(2560).optional(),
  objectFit: z.enum(["cover", "contain", "fill"]).optional(),
});

export const CustomShowcaseSectionSchema = z.object({
  id: z.string().min(1).max(120),
  kind: z.literal("showcase"),
  title: z.string().max(5000),
  subtitle: z.string().max(5000).optional(),
  categoryFilter: z.string().max(5000).optional(),
  productIds: z.array(z.string().max(5000)).default([]),
  limit: z.number().min(1).max(24).default(8),
});

export const CustomGallerySectionSchema = z.object({
  id: z.string().min(1).max(120),
  kind: z.literal("gallery"),
  title: z.string().max(5000),
  subtitle: z.string().max(5000).optional(),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  cardHeightPx: z.number().min(180).max(900).optional(),
  items: z.array(MoodBannerSchema).default([]),
});

export const CustomTarjaSectionSchema = z.object({
  id: z.string().min(1).max(120),
  kind: z.literal("tarja"),
  title: z.string().max(5000),
  backgroundColor: z.string().max(5000).optional(),
  textColor: z.string().max(5000).optional(),
  items: z
    .array(
      z.object({
        icon: z.string().max(500),
        title: z.string().max(5000),
        subtitle: z.string().max(5000),
      })
    )
    .default([]),
});

export const CustomEditorialSplitSectionSchema = z.object({
  id: z.string().min(1).max(120),
  kind: z.literal("editorialSplit"),
  title: z.string().max(5000),
  eyebrow: z.string().max(5000).default("Destaque"),
  headline: z.string().max(5000),
  description: z.string().max(5000).default(""),
  ctaText: z.string().max(5000).default("Explorar"),
  ctaHref: z.string().max(5000).default("#vitrines"),
  imageUrl: z.string().max(4000000).default(""),
  imageSide: z.enum(["left", "right"]).default("left"),
  backgroundColor: z.string().max(5000).optional(),
  textColor: z.string().max(5000).optional(),
});

export const CustomSectionSchema = z.discriminatedUnion("kind", [
  CustomHtmlSectionSchema,
  CustomBannerSectionSchema,
  CustomSlimBannerSectionSchema,
  CustomShowcaseSectionSchema,
  CustomGallerySectionSchema,
  CustomTarjaSectionSchema,
  CustomEditorialSplitSectionSchema,
]);

export type CustomSection = z.infer<typeof CustomSectionSchema>;

export const SectionConfigSchema = z.object({
  id: z.string().min(1).max(120),
  label: z.string().max(5000),
  irrobaModule: z.string().max(5000),
  enabled: z.boolean().default(true),
  isCustom: z.boolean().optional(),
  customKind: CustomSectionKindSchema.optional(),
});

export type SectionConfig = z.infer<typeof SectionConfigSchema>;

export const DEFAULT_SECTION_LAYOUT: SectionConfig[] = [
  { id: "hero", label: "Banner Principal", irrobaModule: "Banner Versão 2", enabled: true },
  { id: "tarja", label: "Tarja de Benefícios", irrobaModule: "Tarja Informativa", enabled: true },
  { id: "editorialGallery", label: "Galeria Editorial", irrobaModule: "Conteúdo HTML", enabled: true },
  { id: "slimBanner", label: "Banner Slim Promocional", irrobaModule: "Banner Versão 2", enabled: true },
  { id: "showcase1", label: "Vitrine Principal", irrobaModule: "Listas de Produtos", enabled: true },
  { id: "secondaryBanner", label: "Banner Secundário", irrobaModule: "Banner Versão 2", enabled: true },
  { id: "editorialLookbook", label: "Lookbook & Manifesto", irrobaModule: "Conteúdo HTML", enabled: true },
  { id: "extraShowcases", label: "Vitrines Adicionais", irrobaModule: "Listas de Produtos", enabled: true },
  { id: "testimonials", label: "Avaliações de Clientes", irrobaModule: "Avaliações", enabled: true },
  { id: "newsletter", label: "Newsletter", irrobaModule: "Newsletter", enabled: true },
];

export function getNormalizedSectionLayout(
  layout?: SectionConfig[],
  customSections?: CustomSection[]
): SectionConfig[] {
  const customById = new Map<string, CustomSection>(
    (customSections ?? []).map((cs) => [cs.id, cs])
  );
  const hasCustomCatalog = customSections !== undefined;

  if (!layout || layout.length === 0) {
    const base = DEFAULT_SECTION_LAYOUT.map((s) => ({ ...s }));
    for (const cs of customSections ?? []) {
      base.push({
        id: cs.id,
        label: cs.title,
        irrobaModule: CUSTOM_SECTION_MODULE_LABELS[cs.kind],
        enabled: true,
        isCustom: true,
        customKind: cs.kind,
      });
    }
    return base;
  }

  const seen = new Set<string>();
  const normalized: SectionConfig[] = [];

  for (const item of layout) {
    if (seen.has(item.id)) continue;
    if (isBuiltinSectionKey(item.id)) {
      seen.add(item.id);
      normalized.push({ ...item });
      continue;
    }
    if (hasCustomCatalog) {
      const matched = customById.get(item.id);
      if (!matched) continue;
      seen.add(item.id);
      normalized.push({
        ...item,
        label: matched.title || item.label,
        irrobaModule: CUSTOM_SECTION_MODULE_LABELS[matched.kind],
        isCustom: true,
        customKind: matched.kind,
      });
    } else if (item.isCustom) {
      seen.add(item.id);
      normalized.push({ ...item });
    }
  }

  for (const def of DEFAULT_SECTION_LAYOUT) {
    if (!seen.has(def.id)) {
      seen.add(def.id);
      normalized.push({ ...def });
    }
  }

  for (const cs of customSections ?? []) {
    if (!seen.has(cs.id)) {
      seen.add(cs.id);
      normalized.push({
        id: cs.id,
        label: cs.title,
        irrobaModule: CUSTOM_SECTION_MODULE_LABELS[cs.kind],
        enabled: true,
        isCustom: true,
        customKind: cs.kind,
      });
    }
  }

  return normalized;
}

export const StoreBlueprintSchema = z.object({
  brand: z.object({
    name: z.string().max(5000).min(1),
    logoUrl: z.string().max(4000000),
    niche: z.string().max(5000),
    tone: z.enum(["modern", "luxury", "vibrant", "minimal", "tech"]),
  }),
  theme: z.object({
    primaryBackground: z.string().max(5000),
    primaryForeground: z.string().max(5000),
    secondaryBackground: z.string().max(5000),
    secondaryForeground: z.string().max(5000),
    neutralBackground: z.string().max(5000),
    neutralForeground: z.string().max(5000),
    bodyBackground: z.string().max(5000),
    bodyForeground: z.string().max(5000),
    btnPrimaryBackground: z.string().max(5000),
    btnPrimaryColor: z.string().max(5000),
    btnPrimaryBorder: z.string().max(5000).default("transparent"),
    btnSecondaryBackground: z.string().max(5000),
    btnSecondaryColor: z.string().max(5000),
    btnSecondaryBorder: z.string().max(5000).default("#111827"),
    btnSecondaryOutline: z.boolean(),
    headingFont: z.string().max(5000),
    bodyFont: z.string().max(5000),
    radius: z.enum(["none", "small", "medium", "large"]),
    headerLayout: z.enum(["layout-1", "layout-2", "layout-3"]),
  }),
  visualOverrides: z.object({
    announcement: z
      .object({
        background: z.string().max(5000),
        foreground: z.string().max(5000),
        messages: z.array(z.string().max(5000)).optional(),
        rollingEnabled: z.boolean().optional(),
        intervalSeconds: z.number().min(1).max(30).optional(),
        transitionMode: z.enum(["slide-up", "slide-horizontal", "fade"]).optional(),
      })
      .default({ background: "#111827", foreground: "#FFFFFF" }),
    header: z.object({
      position: z.enum(["default", "sticky", "overlay"]),
      expanded: z.boolean(),
      gradientTransition: z.boolean(),
      background: z.string().max(5000).default("#FFFFFF"),
      foreground: z.string().max(5000).default("#111827"),
      backgroundOpacity: z.number().min(0).max(1),
      blurPx: z.number().min(0).max(100),
      highContrastLogoOnHover: z.boolean(),
      categoryCase: z.enum(["normal", "uppercase", "lowercase", "capitalize"]),
      logoHeightPx: z.number().min(20).max(140).optional(),
      linkHoverColor: z.string().max(5000).optional(),
      linkHoverStyle: z.enum(["underline", "bottom-bar", "pill", "color-only"]).optional(),
      linkHoverBackground: z.string().max(5000).optional(),
    }),
    banner: z.object({
      width: z.enum(["full", "container"]),
      customWidthPx: z.number().min(280).max(2560).optional(),
      heightPx: z.number().min(120).max(1200).optional(),
      objectFit: z.enum(["cover", "contain", "fill"]).optional(),
    }),
    productCard: z.object({
      listWidth: z.enum(["container", "full"]),
      titleAlign: z.enum(["left", "center", "right"]),
      cardBackground: z.string().max(5000),
      paddingX: z.union([z.literal(8), z.literal(16), z.literal(24), z.literal(40)]),
      buyBtnBackground: z.string().max(5000),
      buyBtnForeground: z.string().max(5000),
      buyBtnBorder: z.string().max(5000).default("transparent"),
      priceColor: z.string().max(5000).default("#111827"),
      oldPriceColor: z.string().max(5000).default("#9CA3AF"),
    }),
    pageProduct: z.object({
      galleryOrientation: z.enum(["vertical", "horizontal"]),
      buyButtonText: z.string().max(5000),
    }),
    footer: z.object({
      width: z.enum(["container", "full"]),
      background: z.string().max(5000),
      foreground: z.string().max(5000).default("#FFFFFF"),
      legalBackground: z.string().max(5000),
      legalForeground: z.string().max(5000),
    }),
  }),
  sections: z.object({
    announcementText: z.string().max(5000),
    categories: z.array(
      z.object({
        label: z.string().max(5000),
        href: z.string().max(5000),
        imageUrl: z.string().max(4000000).optional(),
      })
    ),
    hero: z.object({
      headline: z.string().max(5000),
      subheadline: z.string().max(5000),
      ctaText: z.string().max(5000),
      imageUrl: z.string().max(4000000),
    }),
    heroSlides: z.array(HeroSlideSchema).default([]),
    benefitsBanner: z
      .object({
        mode: z
          .enum(["site-images", "custom-image", "generated-art", "cards"])
          .default("generated-art"),
        backgroundColor: z.string().max(5000).default("#F4F4F5"),
        textColor: z.string().max(5000).default("#111827"),
        siteImageUrls: z.array(z.string().max(4000000)).default([]),
        customImageUrl: z.string().max(4000000).optional(),
        maxHeightPx: z.number().min(36).max(400).optional(),
        maxWidthPx: z.number().min(280).max(1920).optional(),
        fullWidth: z.boolean().optional(),
        paddingY: z.number().min(0).max(48).optional(),
      })
      .optional(),
    slimBanner: z
      .object({
        enabled: z.boolean().default(true),
        mode: z.enum(["image", "designed"]).default("designed"),
        imageUrl: z.string().max(4000000).default(""),
        badgeText: z.string().max(5000).default(DEFAULT_COPY.slimBadge),
        headline: z.string().max(5000).default("Ganhe 5% OFF no PIX e parcelamento sem juros"),
        ctaText: z.string().max(5000).default("Aproveitar"),
        backgroundColor: z.string().max(5000).default("#111827"),
        textColor: z.string().max(5000).default("#FFFFFF"),
        heightPx: z.number().min(40).max(600).optional(),
        widthPx: z.number().min(280).max(2560).optional(),
        objectFit: z.enum(["cover", "contain", "fill"]).optional(),
      })
      .optional(),
    moodSectionTitle: z.string().max(5000).default("Navegue por Estilo & Categorias"),
    moodCardHeightPx: z.number().min(180).max(900).optional(),
    moodBanners: z.array(MoodBannerSchema).default([]),
    secondaryBanner: z
      .object({
        enabled: z.boolean().default(true),
        mode: z.enum(["artwork", "editorial"]).default("editorial"),
        imageUrl: z.string().max(4000000).default(""),
        headline: z.string().max(5000).default("Descubra os mais desejados da coleção"),
        subheadline: z.string().max(5000).default("Qualidade, conforto e design selecionados para você."),
        ctaText: z.string().max(5000).default("Explorar Coleção"),
        backgroundColor: z.string().max(5000).default("#111827"),
        textColor: z.string().max(5000).default("#FFFFFF"),
        heightPx: z.number().min(120).max(1000).optional(),
        widthPx: z.number().min(280).max(2560).optional(),
        objectFit: z.enum(["cover", "contain", "fill"]).optional(),
      })
      .optional(),
    promoStripText: z.string().max(5000),
    benefits: z.array(
      z.object({
        icon: z.string().max(5000),
        title: z.string().max(5000),
        subtitle: z.string().max(5000),
      })
    ),
    showcases: z.array(
      z.object({
        title: z.string().max(5000),
        subtitle: z.string().max(5000).optional(),
        productIds: z.array(z.string().max(5000)),
      })
    ),
    testimonialsTitle: z.string().max(5000).default("Quem compra recomenda"),
    /** true quando os depoimentos são exemplos gerados (heurística/IA), não avaliações reais. */
    testimonialsIllustrative: z.boolean().default(false),
    testimonials: z.array(
      z.object({
        author: z.string().max(5000),
        rating: z.number().min(1).max(5),
        comment: z.string().max(5000),
      })
    ),
    lookbook: z
      .object({
        eyebrow: z.string().max(5000).default("01 / Manifesto"),
        headline: z.string().max(5000).optional(),
        description: z.string().max(5000).optional(),
        ctaText: z.string().max(5000).optional(),
        mainImageUrl: z.string().max(4000000).default(""),
        insetImageUrl: z.string().max(4000000).default(""),
      })
      .optional(),
    newsletter: z
      .object({
        headline: z.string().max(5000).optional(),
        subheadline: z.string().max(5000).optional(),
        placeholder: z.string().max(5000).optional(),
        ctaText: z.string().max(5000).optional(),
      })
      .optional(),
    layout: z.array(SectionConfigSchema).optional(),
    customSections: z.array(CustomSectionSchema).optional(),
    editorialGalleryCustomHtml: z.string().max(150000).optional(),
    editorialLookbookCustomHtml: z.string().max(150000).optional(),
  }),
  products: z.array(
    z.object({
      id: z.string().max(5000),
      title: z.string().max(5000),
      price: z.number().nonnegative(),
      compareAtPrice: z.number().nonnegative().optional(),
      imageUrl: z.string().max(4000000),
      images: z.array(z.string().max(4000000)).default([]),
      category: z.string().max(5000),
      categories: z.array(z.string().max(5000)).default([]),
      installmentsText: z.string().max(5000).optional(),
      description: z.string().max(5000).optional(),
      visible: z.boolean().default(true),
    })
  ),
  footer: z.object({
    aboutText: z.string().max(5000),
    whatsapp: z.string().max(5000).optional(),
    instagram: z.string().max(5000).optional(),
    facebook: z.string().max(5000).optional(),
    email: z.string().max(5000).optional(),
    phone: z.string().max(5000).optional(),
    address: z.string().max(5000).optional(),
    openingHours: z.string().max(5000).optional(),
    ownerName: z.string().max(5000).optional(),
    cnpj: z.string().max(5000).optional(),
    cityState: z.string().max(5000).optional(),
    institutionalLinks: z
      .array(
        z.object({
          label: z.string().max(500),
          href: z.string().max(2000).default("#"),
        })
      )
      .optional(),
    accountLinks: z
      .array(
        z.object({
          label: z.string().max(500),
          href: z.string().max(2000).default("#"),
        })
      )
      .optional(),
    showPaymentSeals: z.boolean().optional(),
    showShippingSeals: z.boolean().optional(),
    showSecuritySeals: z.boolean().optional(),
    legalText: z.string().max(5000).optional(),
  }),
  designInsights: z.array(DesignInsightSchema).default([]),
});

export type StoreBlueprint = z.infer<typeof StoreBlueprintSchema>;

export interface HtmlBlockExport {
  id: string;
  name: string;
  moduleTitle: string;
  recommendedWidth: "Padrão do site (1280px)" | "Largura Total";
  placementNote: string;
  html: string;
}

export interface CompiledExport {
  limeSettings: Array<{
    section: string;
    field: string;
    value: string;
  }>;
  themeVisualChecklist: Array<{
    section: string;
    controls: Array<{ label: string; value: string }>;
  }>;
  bannerModulesChecklist: Array<{
    slotName: string;
    bannerType: "Carrossel" | "Grade";
    moduleType: string;
    recommendedSize: string;
    imageUrl: string;
    notes: string;
  }>;
  tarjaChecklist: {
    moduleName: string;
    itemLayout: "Apenas Imagem" | "Horizontal" | "Vertical";
    visibleDesktop: number;
    visibleTablet: number;
    visibleMobile: number;
    items: Array<{ title: string; description: string; imageUrl?: string }>;
    notes: string;
  };
  productListsChecklist: Array<{
    title: string;
    sourceType: string;
    displayMode: "Carrossel" | "Grade";
    desktopItems: number;
    mobileItems: number;
    titleAlign: string;
    limit: number;
  }>;
  htmlBlocks: HtmlBlockExport[];
  customCss: string;
}
