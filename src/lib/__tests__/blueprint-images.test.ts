import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { buildHeuristicBlueprint } from "@/lib/ai/architect";
import { normalizeExtractedImageUrls } from "@/lib/scraper/store-extractor";
import { sanitizeBlueprintImageUrls, StoreBlueprintSchema } from "@/lib/types/blueprint";
import { makeSampleExtracted } from "./fixtures";

const db = vi.hoisted(() => ({ storePreview: { findUnique: vi.fn() } }));
vi.mock("@/lib/db", () => ({ prisma: db }));

import { getPreviewWithBlueprint } from "@/lib/previews/repository";
import { GET as RENDER } from "@/app/render/[slug]/route";

const DATA_LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const PLACEHOLDER = "data:image/png;base64,R0lGODlhAQABAAAAACw=";
const LONG = `https://cdn.example.com/${"a".repeat(5000)}.jpg`;

beforeEach(() => vi.clearAllMocks());

describe("imagens vindas da página da loja", () => {
  it("logo data: e banner placeholder não invalidam o blueprint heurístico", () => {
    const store = makeSampleExtracted({
      logoUrl: DATA_LOGO,
      banners: [
        { imageUrl: PLACEHOLDER, slot: "hero" },
        { imageUrl: LONG, slot: "slim" },
        { imageUrl: "https://cdn.example.com/mood.jpg", slot: "mood" },
      ],
    });
    normalizeExtractedImageUrls(store, store.sourceUrl);
    expect(store.logoUrl).toBeUndefined();
    expect(store.banners.map((b) => b.imageUrl)).toEqual(["https://cdn.example.com/mood.jpg"]);

    const bp = buildHeuristicBlueprint(store);
    expect(StoreBlueprintSchema.safeParse(bp).success).toBe(true);
  });

  it("heurístico é válido mesmo com dados extraídos antigos (sem normalizar)", () => {
    const store = makeSampleExtracted({
      logoUrl: DATA_LOGO,
      banners: [{ imageUrl: PLACEHOLDER, slot: "hero" }],
    });
    const bp = buildHeuristicBlueprint(store);
    expect(StoreBlueprintSchema.safeParse(bp).success).toBe(true);
    expect(bp.brand.logoUrl).toBe("");
  });
});

describe("leitura tolerante de previews gravados", () => {
  const stored = () => {
    const bp = buildHeuristicBlueprint(makeSampleExtracted()) as unknown as {
      brand: { logoUrl: string };
      sections: { hero: { imageUrl: string } };
      products: Array<{ images: string[] }>;
    };
    bp.brand.logoUrl = DATA_LOGO;
    bp.sections.hero.imageUrl = LONG;
    bp.products[0]!.images = [PLACEHOLDER, "https://cdn.example.com/ok.jpg"];
    return bp;
  };

  it("schema estrito rejeita, mas o saneado passa", () => {
    expect(StoreBlueprintSchema.safeParse(stored()).success).toBe(false);
    expect(StoreBlueprintSchema.safeParse(sanitizeBlueprintImageUrls(stored())).success).toBe(true);
  });

  it("getPreviewWithBlueprint devolve ok com imagens inválidas limpas", async () => {
    db.storePreview.findUnique.mockResolvedValue({ id: "abc", slug: "loja", blueprint: stored() });
    const found = await getPreviewWithBlueprint({ id: "abc" });
    expect(found.status).toBe("ok");
    if (found.status !== "ok") return;
    expect(found.blueprint.brand.logoUrl).toBe("");
    expect(found.blueprint.sections.hero.imageUrl).toBe("");
    expect(found.blueprint.products[0]!.images).toEqual(["https://cdn.example.com/ok.jpg"]);
  });

  it("/render não mostra 'Blueprint inválido' por causa de uma imagem", async () => {
    db.storePreview.findUnique.mockResolvedValue({ id: "abc", slug: "loja", blueprint: stored() });
    const res = await RENDER(new NextRequest("http://localhost/render/loja"), {
      params: Promise.resolve({ slug: "loja" }),
    });
    expect(res.status).toBe(200);
    expect(await res.text()).not.toContain(DATA_LOGO);
  });

  it("blueprint estruturalmente quebrado continua inválido", async () => {
    db.storePreview.findUnique.mockResolvedValue({ id: "abc", slug: "loja", blueprint: { foo: 1 } });
    expect((await getPreviewWithBlueprint({ id: "abc" })).status).toBe("invalid");
  });
});

describe("getPreviewWithBlueprint: inexistente x sem blueprint", () => {
  it("distingue not_found de no_blueprint e mantém 404 no /render", async () => {
    db.storePreview.findUnique.mockResolvedValueOnce(null);
    expect((await getPreviewWithBlueprint({ id: "x" })).status).toBe("not_found");
    db.storePreview.findUnique.mockResolvedValue({ id: "abc", slug: "loja", blueprint: null });
    expect((await getPreviewWithBlueprint({ id: "abc" })).status).toBe("no_blueprint");
    const res = await RENDER(new NextRequest("http://localhost/render/loja"), {
      params: Promise.resolve({ slug: "loja" }),
    });
    expect(res.status).toBe(404);
  });
});
