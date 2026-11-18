import { z } from "zod";

export const ExtractedProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  price: z.number().nonnegative(),
  compareAtPrice: z.number().nonnegative().optional(),
  imageUrl: z.string(),
  images: z.array(z.string()).default([]),
  productUrl: z.string().optional(),
  category: z.string().default("Destaques"),
  categories: z.array(z.string()).default([]),
  description: z.string().optional(),
});

export type ExtractedProduct = z.infer<typeof ExtractedProductSchema>;

export const ExtractedBannerSchema = z.object({
  imageUrl: z.string(),
  alt: z.string().optional(),
  href: z.string().optional(),
  slot: z.enum(["hero", "slim", "secondary", "mood", "benefits"]).default("hero"),
  label: z.string().optional(),
});

export type ExtractedBanner = z.infer<typeof ExtractedBannerSchema>;

export const ExtractedStoreDataSchema = z.object({
  sourceUrl: z.string(),
  detectedPlatform: z.string(),
  storeName: z.string(),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  screenshotPath: z.string().optional(),
  fullScreenshotPath: z.string().optional(),
  tokens: z.object({
    bodyBackground: z.string().optional(),
    bodyForeground: z.string().optional(),
    surfaceBackground: z.string().optional(),
    benefitsBackground: z.string().optional(),
    announcementBackground: z.string().optional(),
    announcementForeground: z.string().optional(),
    headerBackground: z.string().optional(),
    headerForeground: z.string().optional(),
    headerIsOverlay: z.boolean().default(false),
    primaryButtonBg: z.string().optional(),
    primaryButtonColor: z.string().optional(),
    secondaryButtonBg: z.string().optional(),
    secondaryButtonColor: z.string().optional(),
    accentColor: z.string().optional(),
    footerBackground: z.string().optional(),
    footerForeground: z.string().optional(),
    headingFont: z.string().optional(),
    bodyFont: z.string().optional(),
    borderRadiusPx: z.number().optional(),
  }),
  announcementText: z.string().optional(),
  sectionHeadings: z.array(z.string()).default([]),
  categories: z.array(
    z.object({
      label: z.string(),
      href: z.string(),
      imageUrl: z.string().optional(),
    })
  ),
  banners: z.array(ExtractedBannerSchema),
  products: z.array(ExtractedProductSchema),
  contacts: z.object({
    whatsapp: z.string().optional(),
    instagram: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
  }),
});

export type ExtractedStoreData = z.infer<typeof ExtractedStoreDataSchema>;

export const DesignInsightSchema = z.object({
  id: z.string(),
  category: z.enum(["palette", "contrast", "banners", "conversion"]),
  severity: z.enum(["info", "suggestion"]),
  title: z.string(),
  description: z.string(),
  actionLabel: z.string().optional(),
  suggestedThemePatch: z
    .object({
      primaryBackground: z.string().optional(),
      primaryForeground: z.string().optional(),
      secondaryBackground: z.string().optional(),
      secondaryForeground: z.string().optional(),
      neutralBackground: z.string().optional(),
      neutralForeground: z.string().optional(),
      bodyForeground: z.string().optional(),
      btnPrimaryBackground: z.string().optional(),
      btnPrimaryColor: z.string().optional(),
      buyBtnBackground: z.string().optional(),
      buyBtnForeground: z.string().optional(),
    })
    .optional(),
});

export type DesignInsight = z.infer<typeof DesignInsightSchema>;

export const HeroSlideSchema = z.object({
  id: z.string(),
  imageUrl: z.string(),
  headline: z.string(),
  subheadline: z.string(),
  ctaText: z.string(),
  ctaHref: z.string().default("#vitrines"),
  mode: z.enum(["artwork", "editorial"]).default("artwork"),
  enabled: z.boolean().default(true),
});

export const MoodBannerSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().default(""),
  imageUrl: z.string(),
  href: z.string().default("#vitrines"),
  enabled: z.boolean().default(true),
});

export const StoreBlueprintSchema = z.object({
  brand: z.object({
    name: z.string().min(1),
    logoUrl: z.string(),
    niche: z.string(),
    tone: z.enum(["modern", "luxury", "vibrant", "minimal", "tech"]),
  }),
  theme: z.object({
    primaryBackground: z.string(),
    primaryForeground: z.string(),
    secondaryBackground: z.string(),
    secondaryForeground: z.string(),
    neutralBackground: z.string(),
    neutralForeground: z.string(),
    bodyBackground: z.string(),
    bodyForeground: z.string(),
    btnPrimaryBackground: z.string(),
    btnPrimaryColor: z.string(),
    btnPrimaryBorder: z.string().default("transparent"),
    btnSecondaryBackground: z.string(),
    btnSecondaryColor: z.string(),
    btnSecondaryBorder: z.string().default("#111827"),
    btnSecondaryOutline: z.boolean(),
    headingFont: z.string(),
    bodyFont: z.string(),
    radius: z.enum(["none", "small", "medium", "large"]),
    headerLayout: z.enum(["layout-1", "layout-2", "layout-3"]),
  }),
  visualOverrides: z.object({
    announcement: z
      .object({
        background: z.string(),
        foreground: z.string(),
      })
      .default({ background: "#111827", foreground: "#FFFFFF" }),
    header: z.object({
      position: z.enum(["default", "sticky", "overlay"]),
      expanded: z.boolean(),
      gradientTransition: z.boolean(),
      background: z.string().default("#FFFFFF"),
      foreground: z.string().default("#111827"),
      backgroundOpacity: z.number().min(0).max(1),
      blurPx: z.number().min(0).max(100),
      highContrastLogoOnHover: z.boolean(),
      categoryCase: z.enum(["normal", "uppercase", "lowercase", "capitalize"]),
    }),
    banner: z.object({
      width: z.enum(["full", "container"]),
    }),
    productCard: z.object({
      listWidth: z.enum(["container", "full"]),
      titleAlign: z.enum(["left", "center", "right"]),
      cardBackground: z.string(),
      paddingX: z.union([z.literal(8), z.literal(16), z.literal(24), z.literal(40)]),
      buyBtnBackground: z.string(),
      buyBtnForeground: z.string(),
      buyBtnBorder: z.string().default("transparent"),
      priceColor: z.string().default("#111827"),
      oldPriceColor: z.string().default("#9CA3AF"),
    }),
    pageProduct: z.object({
      galleryOrientation: z.enum(["vertical", "horizontal"]),
      buyButtonText: z.string(),
    }),
    footer: z.object({
      width: z.enum(["container", "full"]),
      background: z.string(),
      foreground: z.string().default("#FFFFFF"),
      legalBackground: z.string(),
      legalForeground: z.string(),
    }),
  }),
  sections: z.object({
    announcementText: z.string(),
    categories: z.array(
      z.object({
        label: z.string(),
        href: z.string(),
        imageUrl: z.string().optional(),
      })
    ),
    hero: z.object({
      headline: z.string(),
      subheadline: z.string(),
      ctaText: z.string(),
      imageUrl: z.string(),
    }),
    heroSlides: z.array(HeroSlideSchema).default([]),
    benefitsBanner: z
      .object({
        mode: z.enum(["site-images", "generated-art", "cards"]).default("generated-art"),
        backgroundColor: z.string().default("#F4F4F5"),
        textColor: z.string().default("#111827"),
        siteImageUrls: z.array(z.string()).default([]),
      })
      .optional(),
    slimBanner: z
      .object({
        enabled: z.boolean().default(true),
        mode: z.enum(["image", "designed"]).default("designed"),
        imageUrl: z.string().default(""),
        badgeText: z.string().default("OFERTA ESPECIAL"),
        headline: z.string().default("Ganhe 5% OFF no PIX e parcelamento sem juros"),
        ctaText: z.string().default("Aproveitar"),
        backgroundColor: z.string().default("#111827"),
        textColor: z.string().default("#FFFFFF"),
      })
      .optional(),
    moodSectionTitle: z.string().default("Navegue por Estilo & Categorias"),
    moodBanners: z.array(MoodBannerSchema).default([]),
    secondaryBanner: z
      .object({
        enabled: z.boolean().default(true),
        mode: z.enum(["artwork", "editorial"]).default("editorial"),
        imageUrl: z.string().default(""),
        headline: z.string().default("Descubra os mais desejados da coleção"),
        subheadline: z.string().default("Qualidade, conforto e design selecionados para você."),
        ctaText: z.string().default("Explorar Coleção"),
        backgroundColor: z.string().default("#111827"),
        textColor: z.string().default("#FFFFFF"),
      })
      .optional(),
    promoStripText: z.string(),
    benefits: z.array(
      z.object({
        icon: z.string(),
        title: z.string(),
        subtitle: z.string(),
      })
    ),
    showcases: z.array(
      z.object({
        title: z.string(),
        subtitle: z.string().optional(),
        productIds: z.array(z.string()),
      })
    ),
    testimonialsTitle: z.string().default("Quem compra recomenda"),
    testimonials: z.array(
      z.object({
        author: z.string(),
        rating: z.number().min(1).max(5),
        comment: z.string(),
      })
    ),
  }),
  products: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      price: z.number().nonnegative(),
      compareAtPrice: z.number().nonnegative().optional(),
      imageUrl: z.string(),
      images: z.array(z.string()).default([]),
      category: z.string(),
      categories: z.array(z.string()).default([]),
      installmentsText: z.string().optional(),
      description: z.string().optional(),
      visible: z.boolean().default(true),
    })
  ),
  footer: z.object({
    aboutText: z.string(),
    whatsapp: z.string().optional(),
    instagram: z.string().optional(),
    email: z.string().optional(),
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
    moduleType: string;
    imageUrl: string;
    notes: string;
  }>;
  htmlBlocks: HtmlBlockExport[];
  customCss: string;
}
