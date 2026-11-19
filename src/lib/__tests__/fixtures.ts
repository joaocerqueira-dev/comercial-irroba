import type { ExtractedStoreData } from "@/lib/types/blueprint";

/** Dados extraídos de exemplo para testes. */
export function makeSampleExtracted(overrides: Partial<ExtractedStoreData> = {}): ExtractedStoreData {
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
