import { describe, expect, it } from "vitest";
import { contrastRatio, getContrastingForeground, normalizeHex, parseColorToRgb } from "@/lib/ai/color-utils";
import { extractJsonObject } from "@/lib/ai/architect";
import { escapeHtml, sanitizeCssColor, sanitizeFontName } from "@/lib/irroba-blocks/sanitize";
import { cleanAltText, fontFallback, stripPreviewAttributes } from "@/lib/irroba-blocks/compiler";
import { formatWhatsapp, isValidWhatsapp, normalizeStoreUrl, pluralize } from "@/lib/format/inputs";

describe("color-utils", () => {
  it("parse e contraste", () => {
    expect(parseColorToRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(getContrastingForeground("#000000")).toBe("#FFFFFF");
    expect(normalizeHex("lixo", "#111111")).toBe("#111111");
  });
});

describe("extractJsonObject", () => {
  it("remove cercas de markdown", () => {
    expect(extractJsonObject('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it("lança em JSON inválido", () => {
    expect(() => extractJsonObject("não é json")).toThrow();
  });
});

describe("sanitize", () => {
  it("escapa HTML e rejeita CSS perigoso", () => {
    expect(escapeHtml("</script>")).toBe("&lt;/script&gt;");
    expect(sanitizeCssColor("red;background:url(x)")).toBe("#111827");
    expect(sanitizeFontName("Arial'; } body {")).not.toMatch(/[;{}'"<>]/);
  });
});

describe("helpers do export", () => {
  it("fallback serifado, alt limpo e sem data-irb", () => {
    expect(fontFallback("Cormorant Garamond")).toBe("serif");
    expect(fontFallback("Poppins")).toBe("sans-serif");
    expect(cleanAltText("Botas ↗")).toBe("Botas");
    expect(stripPreviewAttributes('<a href="#" data-irb-cat="x">a</a>')).toBe('<a href="#">a</a>');
  });
});

describe("inputs", () => {
  it("normaliza URL da loja", () => {
    expect(normalizeStoreUrl("loja.com.br")).toBe("https://loja.com.br/");
    expect(normalizeStoreUrl("abc lojaqualquer")).toBeNull();
    expect(normalizeStoreUrl("abc")).toBeNull();
  });
  it("WhatsApp", () => {
    expect(formatWhatsapp("11999998888")).toBe("+55 (11) 99999-8888");
    expect(isValidWhatsapp("+55 (11) 99999-8888")).toBe(true);
    expect(isValidWhatsapp("123")).toBe(false);
    expect(isValidWhatsapp("")).toBe(true);
    expect(pluralize(1, "loja", "lojas")).toBe("1 loja");
  });
});
