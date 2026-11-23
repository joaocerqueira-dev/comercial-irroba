import { describe, expect, it } from "vitest";
import { ensureReadableForeground } from "@/lib/ai/architect";
import {
  ALLOWED_FONTS,
  FONT_PAIRINGS,
  mapBorderRadius,
  matchAllowedFont,
  pickFontPairingForStore,
} from "@/lib/layout-patterns";
import { FONT_OPTIONS } from "@/components/studio/fontOptions";

describe("layout patterns", () => {
  it("escolhe o par de fontes pelo nicho antes do tom", () => {
    expect(pickFontPairingForStore("Calçados veganos", "minimal")).toBe(FONT_PAIRINGS.editorial);
    expect(pickFontPairingForStore("Semijoias e perfumes", "luxury")).toBe(FONT_PAIRINGS.elegant);
    expect(pickFontPairingForStore("Perfumaria e cosméticos", "luxury")).toBe(FONT_PAIRINGS.editorial);
    expect(pickFontPairingForStore("Notebook gamer", "tech")).toBe(FONT_PAIRINGS.tech);
    expect(pickFontPairingForStore("Whey e suplementos", "vibrant")).toBe(FONT_PAIRINGS.sporty);
    expect(pickFontPairingForStore("Loja genérica", "minimal")).toBe(FONT_PAIRINGS.editorial);
  });

  it("não casa palavras-chave no meio de outras palavras", () => {
    expect(pickFontPairingForStore("autenticidade garantida", "modern")).toBe(FONT_PAIRINGS.sporty);
  });

  it("valida fontes contra a lista única", () => {
    expect(matchAllowedFont("playfair display")).toBe("Playfair Display");
    expect(matchAllowedFont("Comic Sans MS")).toBeUndefined();
    expect(matchAllowedFont(42)).toBeUndefined();
    expect(FONT_OPTIONS).toEqual([...ALLOWED_FONTS]);
  });

  it("mantém o foreground conhecido quando ainda é legível", () => {
    expect(ensureReadableForeground("#FFFFFF", "#333333")).toBe("#333333");
    expect(ensureReadableForeground("#FFFFFF", "#EEEEEE")).toBe("#111827");
  });

  it("mapeia raios em buckets", () => {
    expect([undefined, 2, 6, 14, 15].map(mapBorderRadius)).toEqual(["none", "none", "small", "medium", "large"]);
  });
});

describe("depoimentos ilustrativos", () => {
  it("heurística marca depoimentos como ilustrativos e o HTML avisa", async () => {
    const { buildHeuristicBlueprint } = await import("@/lib/ai/architect");
    const { compileStorefrontDocument } = await import("@/lib/irroba-blocks/compiler");
    const { DEFAULT_COPY } = await import("@/lib/layout-patterns");
    const bp = buildHeuristicBlueprint({
      sourceUrl: "https://x.example.com/",
      storeName: "X",
      tokens: { headerIsOverlay: false },
      sectionHeadings: [],
      categories: [],
      banners: [],
      products: [],
      contacts: {},
    } as never);
    expect(bp.sections.testimonialsIllustrative).toBe(true);
    expect(compileStorefrontDocument(bp)).toContain("Depoimentos ilustrativos");
    expect(
      compileStorefrontDocument({ ...bp, sections: { ...bp.sections, testimonialsIllustrative: false } })
    ).toContain(DEFAULT_COPY.testimonialsSubtitle);
  });
});
