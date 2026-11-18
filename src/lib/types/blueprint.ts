import { z } from "zod";

export const ExtractedProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  price: z.number().nonnegative(),
  compareAtPrice: z.number().nonnegative().optional(),
  imageUrl: z.string(),
  productUrl: z.string().optional(),
  category: z.string().default("Destaques"),
  description: z.string().optional(),
});

export type ExtractedProduct = z.infer<typeof ExtractedProductSchema>;

export const ExtractedStoreDataSchema = z.object({
  sourceUrl: z.string(),
  detectedPlatform: z.string(),
  storeName: z.string(),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  screenshotPath: z.string().optional(),
  tokens: z.object({
    bodyBackground: z.string().optional(),
    bodyForeground: z.string().optional(),
    headerBackground: z.string().optional(),
    headerForeground: z.string().optional(),
    headerIsOverlay: z.boolean().default(false),
    primaryButtonBg: z.string().optional(),
    primaryButtonColor: z.string().optional(),
    accentColor: z.string().optional(),
    headingFont: z.string().optional(),
    bodyFont: z.string().optional(),
    borderRadiusPx: z.number().optional(),
  }),
  categories: z.array(
    z.object({
      label: z.string(),
      href: z.string(),
      imageUrl: z.string().optional(),
    })
  ),
  banners: z.array(
    z.object({
      imageUrl: z.string(),
      alt: z.string().optional(),
      href: z.string().optional(),
    })
  ),
  products: z.array(ExtractedProductSchema),
  contacts: z.object({
    whatsapp: z.string().optional(),
    instagram: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
  }),
});

export type ExtractedStoreData = z.infer<typeof ExtractedStoreDataSchema>;

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
    btnSecondaryBackground: z.string(),
    btnSecondaryColor: z.string(),
    btnSecondaryOutline: z.boolean(),
    headingFont: z.string(),
    bodyFont: z.string(),
    radius: z.enum(["none", "small", "medium", "large"]),
    headerLayout: z.enum(["layout-1", "layout-2", "layout-3"]),
  }),
  visualOverrides: z.object({
    header: z.object({
      position: z.enum(["default", "sticky", "overlay"]),
      expanded: z.boolean(),
      gradientTransition: z.boolean(),
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
    }),
    pageProduct: z.object({
      galleryOrientation: z.enum(["vertical", "horizontal"]),
      buyButtonText: z.string(),
    }),
    footer: z.object({
      width: z.enum(["container", "full"]),
      background: z.string(),
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
      category: z.string(),
      installmentsText: z.string().optional(),
      description: z.string().optional(),
    })
  ),
  footer: z.object({
    aboutText: z.string(),
    whatsapp: z.string().optional(),
    instagram: z.string().optional(),
    email: z.string().optional(),
  }),
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
  htmlBlocks: HtmlBlockExport[];
  customCss: string;
}
