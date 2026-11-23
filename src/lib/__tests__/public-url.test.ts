import { describe, expect, it } from "vitest";
import { absolutizeCaptureUrls, listCaptureUrls, toAbsolutePublicUrl } from "@/lib/public-url";
import { inferShowcaseSource } from "@/lib/catalog-source";

describe("public-url", () => {
  it("prefixa base pública", () => {
    expect(toAbsolutePublicUrl("/api/captures/a.png", "https://cdn.x.com/")).toBe("https://cdn.x.com/api/captures/a.png");
    expect(toAbsolutePublicUrl("https://y.com/a.png", "https://cdn.x.com")).toBe("https://y.com/a.png");
    expect(toAbsolutePublicUrl("/api/captures/a.png", null, "http://localhost:3000")).toBe("http://localhost:3000/api/captures/a.png");
  });
  it("reescreve HTML", () => {
    const html = `<img src="/api/captures/a.png"><div style="background:url('/api/captures/b.webp')"></div>`;
    const out = absolutizeCaptureUrls(html, "https://cdn.x.com");
    expect(out).toContain('src="https://cdn.x.com/api/captures/a.png"');
    expect(out).toContain("url('https://cdn.x.com/api/captures/b.webp')");
    expect(listCaptureUrls(html)).toEqual(["/api/captures/a.png", "/api/captures/b.webp"]);
  });
});

describe("inferShowcaseSource", () => {
  it("infere pelo título", () => {
    expect(inferShowcaseSource("Lançamentos da semana")).toBe("Lançamentos");
    expect(inferShowcaseSource("Mais vendidos")).toBe("Mais Vendidos");
    expect(inferShowcaseSource("Coleção Verão")).toBe("A definir");
  });
});
