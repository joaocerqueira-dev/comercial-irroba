import { describe, expect, it, vi } from "vitest";
import { buildHeuristicBlueprint } from "@/lib/ai/architect";
import {
  compileIrrobaExport,
  compileProductsCsv,
  compileStorefrontDocument,
} from "@/lib/irroba-blocks/compiler";
import type { ExtractedStoreData } from "@/lib/types/blueprint";

// Rede de segurança: garante que extrair os padrões para src/lib/layout-patterns
// não altera o layout gerado. Atualize com `vitest -u` apenas em mudanças intencionais.

function base(o: Partial<ExtractedStoreData> = {}): ExtractedStoreData {
  return {
    sourceUrl: "https://loja.example.com/",
    detectedPlatform: "Nuvemshop",
    storeName: "Loja Exemplo",
    description: "",
    logoUrl: "https://cdn.example.com/logo.png",
    tokens: { bodyBackground: "#FFFFFF", bodyForeground: "#111827", headerIsOverlay: false },
    sectionHeadings: ["Lançamentos", "Mais vendidos"],
    categories: [
      { label: "Categoria A", href: "https://loja.example.com/a" },
      { label: "Categoria B", href: "https://loja.example.com/b" },
    ],
    banners: [{ imageUrl: "https://cdn.example.com/hero.jpg", alt: "Hero", slot: "hero" }],
    products: Array.from({ length: 10 }, (_, i) => ({
      id: `p${i}`,
      title: `Produto ${i}`,
      price: 100 + i,
      imageUrl: `https://cdn.example.com/p${i}.jpg`,
      images: [`https://cdn.example.com/p${i}.jpg`],
      category: "Categoria A",
      categories: ["Categoria A"],
    })),
    contacts: {},
    ...o,
  } as ExtractedStoreData;
}

const fixtures: Record<string, ExtractedStoreData> = {
  vegan: base({ storeName: "Veggie Shoes", description: "calçados veganos", tokens: { bodyBackground: "#FFFFFF", bodyForeground: "#111827", primaryButtonBg: "#026526", headerIsOverlay: false, borderRadiusPx: 8 } }),
  luxury: base({ storeName: "Joias Lux", description: "joia semi joia perfume", tokens: { bodyBackground: "#FAF7F2", headerIsOverlay: false, headingFont: "Arial", bodyFont: "Arial", borderRadiusPx: 1 } }),
  tech: base({ storeName: "Gamer Tech", description: "notebook gamer celular", tokens: { bodyBackground: "#0B0B0F", bodyForeground: "#EEEEEE", primaryButtonBg: "#F5D90A", headerIsOverlay: true, borderRadiusPx: 20 } }),
  fitness: base({ storeName: "Fit Sup", description: "suplemento whey academia", tokens: { bodyBackground: "#FFFFFF", headerIsOverlay: false, headingFont: "Anton", bodyFont: "Lato", borderRadiusPx: 12 } }),
  generic: base({ tokens: { headerIsOverlay: false } as ExtractedStoreData["tokens"], banners: [], products: [] }),
};

describe("layout patterns golden", () => {
  vi.useFakeTimers();
  // Meio do ano: o ano do rodapé não depende do fuso (CI roda em UTC, dev em -03).
  vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
  for (const [name, ex] of Object.entries(fixtures)) {
    it(name, () => {
      const bp = buildHeuristicBlueprint(ex);
      const exp = compileIrrobaExport(bp);
      expect(bp).toMatchSnapshot("blueprint");
      expect(exp).toMatchSnapshot("export");
      expect(compileProductsCsv(bp)).toMatchSnapshot("csv");
      expect(compileStorefrontDocument(bp, exp)).toMatchSnapshot("html");
    });
  }
});
