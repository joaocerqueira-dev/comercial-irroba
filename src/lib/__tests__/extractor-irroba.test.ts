import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractStoreFromHtml } from "@/lib/scraper/store-extractor";

const html = fs.readFileSync(path.join(__dirname, "fixtures", "irroba-pralana-home.html"), "utf8");

describe("extractStoreFromHtml com tema Irroba", () => {
  const data = extractStoreFromHtml(html, "https://loja.pralana.com.br/");

  it("lê produtos dos cards .product-thumb", () => {
    expect(data.products.length).toBe(4);
    const first = data.products[0];
    expect(first.title).toBe("Arizona Storm- Café - 120147053274");
    expect(first.price).toBe(455.3);
    expect(first.productUrl).toBe("https://loja.pralana.com.br/arizona-storm-cafe-120147053274");
    expect(first.imageUrl).toContain("12014705-storn-3274-baixa.png");
    expect(first.images[1]).toContain("interno-baixa.png");
    expect(first.badge).toBe("Lançamento!");
    expect(first.sizes).toEqual(["PP", "P", "M", "G", "GG"]);
  });

  it("lê categorias de nav#menu ignorando Entrar/Cadastrar", () => {
    const labels = data.categories.map((c) => c.label);
    expect(labels.length).toBeGreaterThanOrEqual(4);
    expect(labels[0]).toBe("Barretos 2026");
    expect(labels).not.toContain("Entrar");
    expect(labels).not.toContain("Cadastrar");
  });

  it("lê banners do carrossel (hero) e do grid (mood)", () => {
    const hero = data.banners.filter((b) => b.slot === "hero");
    expect(hero.length).toBe(2);
    expect(hero[0].alt).toBe("Country");
    expect(hero[0].imageUrl).toContain("1920x720");
    expect(hero[1].href).toBe("https://loja.pralana.com.br/linha-social-chapeus");
    const mood = data.banners.filter((b) => b.slot === "mood");
    expect(mood[0]?.alt).toBe("Linha Donna");
  });

  it("lê títulos de vitrine", () => {
    expect(data.sectionHeadings).toContain("Nossos Destaques");
  });
});
