import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { escapeCsvCell } from "@/lib/irroba-blocks/sanitize";
import {
  readBufferCapped,
  readTextCapped,
  ResponseTooLargeError,
} from "@/lib/net/safe-fetch";
import { fetchStoreHtml, tryShopifyProductsProbe } from "@/lib/scraper/store-extractor";
import {
  isAllowedArtStudioRequest,
  normalizeImageMime,
  processAiImageRequest,
} from "@/lib/ai/image-studio";

const redirect = (to: string) => new Response(null, { status: 302, headers: { location: to } });

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("SSRF no fetch do extractor", () => {
  it("leitura rápida do HTML não segue redirect para IP interno", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(redirect("http://169.254.169.254/latest/meta-data"));
    const out = await fetchStoreHtml("http://8.8.8.8/");
    expect(out.html).toBe("");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0][1] as RequestInit).redirect).toBe("manual");
  });

  it("probe da Shopify não segue redirect para IP interno", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(redirect("http://127.0.0.1:8080/admin"));
    expect(await tryShopifyProductsProbe("http://8.8.8.8/")).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("probe da Shopify ainda lê produtos de destino público", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          products: [{ id: 1, title: "Bolsa", images: [{ src: "https://cdn.x/1.jpg" }], variants: [{ price: "99.90" }] }],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const products = await tryShopifyProductsProbe("http://8.8.8.8/");
    expect(products).toHaveLength(1);
    expect(products[0].price).toBe(99.9);
  });

  it("HTML é cortado no limite em vez de carregar tudo na memória", async () => {
    const big = "a".repeat(1000);
    const text = await readTextCapped(new Response(big), 100);
    expect(text).toHaveLength(100);
  });

  it("readBufferCapped recusa corpo acima do teto (header e stream)", async () => {
    await expect(
      readBufferCapped(new Response("x", { headers: { "content-length": "999999" } }), 10)
    ).rejects.toBeInstanceOf(ResponseTooLargeError);
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        for (let i = 0; i < 5; i++) c.enqueue(new Uint8Array(8));
        c.close();
      },
    });
    await expect(readBufferCapped(new Response(stream), 20)).rejects.toBeInstanceOf(ResponseTooLargeError);
    expect((await readBufferCapped(new Response("abc"), 20)).toString()).toBe("abc");
  });
});

describe("arte IA: MIME, rede e chave", () => {
  it("MIME fora da allowlist ou com aspas vira image/jpeg", () => {
    expect(normalizeImageMime("image/png")).toBe("image/png");
    expect(normalizeImageMime("IMAGE/WEBP; charset=binary")).toBe("image/webp");
    expect(normalizeImageMime('image/png"><script>alert(1)</script>')).toBe("image/jpeg");
    expect(normalizeImageMime("image/png;base64,AAAA\" onerror=\"x")).toBe("image/png");
    expect(normalizeImageMime("text/html")).toBe("image/jpeg");
    expect(normalizeImageMime("image/svg+xml")).toBe("image/jpeg");
    expect(normalizeImageMime(undefined)).toBe("image/jpeg");
  });

  it("render só libera data: e as fontes do Google", () => {
    expect(isAllowedArtStudioRequest("data:image/png;base64,AAAA")).toBe(true);
    expect(isAllowedArtStudioRequest("https://fonts.googleapis.com/css2?family=Poppins")).toBe(true);
    expect(isAllowedArtStudioRequest("https://fonts.gstatic.com/s/poppins/v1/a.woff2")).toBe(true);
    expect(isAllowedArtStudioRequest("http://169.254.169.254/")).toBe(false);
    expect(isAllowedArtStudioRequest("https://fonts.googleapis.com.evil.com/")).toBe(false);
    expect(isAllowedArtStudioRequest("http://fonts.googleapis.com/")).toBe(false);
  });

  it("chave do Gemini vai no header x-goog-api-key, nunca na URL", async () => {
    vi.stubEnv("GEMINI_API_KEY", "chave-secreta");
    const png = Buffer.alloc(400, 1).toString("base64");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png"x', data: png } }] } }],
        }),
        { status: 200 }
      )
    );
    const result = await processAiImageRequest({
      previewId: "test-phase1-gemini",
      prompt: "x",
      mode: "generate",
      aspectRatio: "1:1",
      brandName: "Loja",
      niche: "moda",
      palette: { primary: "#000", primaryFg: "#fff", secondary: "#111", secondaryFg: "#fff", neutral: "#eee" },
    });
    try {
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).not.toContain("key=");
      expect(url).not.toContain("chave-secreta");
      expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("chave-secreta");
      // MIME inválido do Gemini é normalizado para jpeg
      expect(result.imageUrl).toMatch(/\.jpg$/);
    } finally {
      const file = path.join(process.cwd(), "public", "captures", path.basename(result.imageUrl));
      await fs.rm(file, { force: true });
    }
  });
});

describe("CSV injection", () => {
  it("prefixa apóstrofo em células que começam como fórmula", () => {
    expect(escapeCsvCell("=HYPERLINK(\"http://x\")")).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(escapeCsvCell("+1")).toBe("'+1");
    expect(escapeCsvCell("-2+3")).toBe("'-2+3");
    expect(escapeCsvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(escapeCsvCell("\tcmd")).toBe("'\tcmd");
    expect(escapeCsvCell("\r=1")).toBe(`"'\r=1"`);
  });
  it("não altera texto comum nem números", () => {
    expect(escapeCsvCell("Bolsa de couro")).toBe("Bolsa de couro");
    expect(escapeCsvCell("a, b")).toBe('"a, b"');
    expect(escapeCsvCell(-5)).toBe("-5");
    expect(escapeCsvCell(null)).toBe("");
  });
});
