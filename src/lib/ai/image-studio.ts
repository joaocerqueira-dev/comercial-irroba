import { createOpenAI } from "@ai-sdk/openai";
import { generateImage, generateText } from "ai";
import { extractJsonObject } from "@/lib/ai/architect";
import { describeAiError } from "@/lib/ai/errors";
import type { UserImageAi, UserTextAi } from "@/lib/ai/providers";
import { mimeFromFilename } from "@/lib/files/mime";
import { BROWSER_USER_AGENT } from "@/lib/net/constants";
import crypto from "node:crypto";
import { getSharedBrowser } from "@/lib/scraper/browser";
import { fetchPublic, readBufferCapped } from "@/lib/net/safe-fetch";
import { aiImageFilePrefix } from "@/lib/files/captures";
import { withBrowserSlot } from "@/lib/net/rate-limit";
import fs from "node:fs/promises";
import path from "node:path";
import { escapeHtml, sanitizeCssColor, sanitizeFontName } from "@/lib/irroba-blocks/sanitize";

export type AiImageAspectRatio = "16:9" | "21:9" | "3:4" | "1:1";
export type AiImageMode = "enhance" | "resize" | "generate";

export interface AiImageRequest {
  previewId: string;
  prompt: string;
  mode: AiImageMode;
  aspectRatio: AiImageAspectRatio;
  sourceImageUrl?: string;
  sourceStoreUrl?: string;
  slotLabel?: string;
  brandName: string;
  niche: string;
  headingFont?: string;
  bodyFont?: string;
  palette: {
    primary: string;
    primaryFg: string;
    secondary: string;
    secondaryFg: string;
    neutral: string;
  };
}

/** Monta o pedido de imagem a partir da identidade do blueprint (antes duplicado em generate e ai-image). */
export function buildImageRequestFromBlueprint(
  bp: {
    brand: { name: string; niche: string };
    theme: {
      headingFont?: string;
      bodyFont?: string;
      primaryBackground: string;
      primaryForeground: string;
      secondaryBackground: string;
      secondaryForeground: string;
      neutralBackground: string;
    };
  },
  req: Omit<AiImageRequest, "brandName" | "niche" | "headingFont" | "bodyFont" | "palette">
): AiImageRequest {
  return {
    ...req,
    brandName: bp.brand.name,
    niche: bp.brand.niche,
    headingFont: bp.theme.headingFont,
    bodyFont: bp.theme.bodyFont,
    palette: {
      primary: bp.theme.primaryBackground,
      primaryFg: bp.theme.primaryForeground,
      secondary: bp.theme.secondaryBackground,
      secondaryFg: bp.theme.secondaryForeground,
      neutral: bp.theme.neutralBackground,
    },
  };
}

export interface AiImageResult {
  imageUrl: string;
  width: number;
  height: number;
  engine: "ai-image" | "art-studio";
  modelUsed: string;
  notice?: string;
}

const DIMENSIONS_BY_RATIO: Record<AiImageAspectRatio, { width: number; height: number }> = {
  "16:9": { width: 1920, height: 1080 },
  "21:9": { width: 1920, height: 420 },
  "3:4": { width: 900, height: 1200 },
  "1:1": { width: 1080, height: 1080 },
};

/** Melhorar/redimensionar só existem na IA de imagem Gemini. */
export class AiImageModeUnsupportedError extends Error {
  constructor() {
    super("Melhorar e redimensionar imagem funcionam só com IA de imagem Gemini.");
    this.name = "AiImageModeUnsupportedError";
  }
}

const OPENAI_SIZE_BY_RATIO: Record<AiImageAspectRatio, `${number}x${number}`> = {
  "16:9": "1536x1024",
  "21:9": "1536x1024",
  "3:4": "1024x1536",
  "1:1": "1024x1024",
};

/** Teto do download da imagem base. */
export const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024;

const ALLOWED_IMAGE_MIME_RE = /^image\/(png|jpeg|webp|avif|gif)$/;

/**
 * MIME seguro para montar `data:` URI e para o Gemini.
 * Qualquer valor fora da allowlist (inclusive com aspas, parâmetros estranhos ou SVG) vira image/jpeg.
 */
export function normalizeImageMime(raw: string | null | undefined): string {
  const base = (raw ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  return ALLOWED_IMAGE_MIME_RE.test(base) ? base : "image/jpeg";
}

const isSvgMime = (raw: string | null | undefined) => /svg/i.test(raw ?? "");

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/** Timeout próprio da etapa, cancelado também quando o pedido do cliente é abortado. */
function withTimeout(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

/** Chave no header x-goog-api-key: não vaza em logs de URL nem em mensagens de erro. */
function geminiRequestInit(apiKey: string, body: unknown, timeoutMs: number, signal?: AbortSignal): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
    signal: withTimeout(signal, timeoutMs),
  };
}

async function loadImageAsBuffer(
  imageUrl: string | undefined,
  refererUrl?: string,
  signal?: AbortSignal
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (!imageUrl || !imageUrl.trim()) return null;
  const trimmed = imageUrl.trim();

  // 1) Local cached capture / asset
  if (trimmed.startsWith("/api/captures/")) {
    const safeName = path.basename(trimmed.replace("/api/captures/", ""));
    const diskPath = path.join(process.cwd(), "public", "captures", safeName);
    try {
      const rawMime = mimeFromFilename(safeName);
      if (isSvgMime(rawMime)) return null;
      const stat = await fs.stat(diskPath);
      if (stat.size > MAX_SOURCE_IMAGE_BYTES) return null;
      const buffer = await fs.readFile(diskPath);
      return { buffer, mimeType: normalizeImageMime(rawMime) };
    } catch {
      return null;
    }
  }

  // 2) External HTTP(S) image with anti-hotlink Referer
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const res = await fetchPublic(trimmed, {
        headers: {
          "User-Agent":
            BROWSER_USER_AGENT,
          ...(refererUrl ? { Referer: refererUrl } : {}),
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
        signal: withTimeout(signal, 8000),
      });
      if (!res || !res.ok) return null;
      const ct = (res.headers.get("content-type") || "image/jpeg").split(";")[0].trim().toLowerCase();
      if ((!ct.startsWith("image/") && ct !== "application/octet-stream") || isSvgMime(ct)) {
        await res.body?.cancel().catch(() => undefined);
        return null;
      }
      const buffer = await readBufferCapped(res, MAX_SOURCE_IMAGE_BYTES);
      if (buffer.length < 300) return null;
      return { buffer, mimeType: normalizeImageMime(ct) };
    } catch {
      return null;
    }
  }

  return null;
}

type NativeImage = { buffer: Buffer; mimeType: string; modelUsed: string };

/** Uma chamada só, no modelo do usuário (sem troca silenciosa). Falha → { error } para o fallback. */
async function tryNativeImage(
  req: AiImageRequest,
  sourceImage: { buffer: Buffer; mimeType: string } | null,
  imageAi: UserImageAi,
  signal?: AbortSignal
): Promise<NativeImage | { error: unknown }> {
  try {
    return imageAi.provider === "openai"
      ? await openAiImage(req, imageAi, signal)
      : await geminiImage(req, sourceImage, imageAi, signal);
  } catch (err) {
    // Cliente desistiu: propaga em vez de cair no fallback
    signal?.throwIfAborted();
    return { error: err };
  }
}

function imagePrompt(req: AiImageRequest): string {
  const modeInstruction =
    req.mode === "enhance"
      ? "Melhore a nitidez, iluminação de estúdio e resolução desta imagem preservando fielmente o produto/sujeito original, sem textos indesejados."
      : req.mode === "resize"
        ? `Reenquadre e estenda o cenário naturalmente para a proporção ${req.aspectRatio} em alta definição, mantendo o produto centralizado e sem cortes nem distorções.`
        : `Crie uma fotografia/arte publicitária sofisticada de e-commerce em alta definição para a marca "${req.brandName}" (nicho: ${req.niche}), harmonizando com a paleta ${req.palette.primary} e ${req.palette.neutral}.`;

  return `${modeInstruction}
Solicitação específica do diretor criativo: ${req.prompt.trim() || "Visual editorial limpo, luxuoso e de alta conversão para loja virtual."}
Slot: ${req.slotLabel || "Banner de Loja Virtual"}.
Entregue imagem limpa, fotográfica ou editorial de altíssima qualidade, sem marcas d'água.`;
}

async function openAiImage(req: AiImageRequest, imageAi: UserImageAi, signal?: AbortSignal): Promise<NativeImage> {
  const { image } = await generateImage({
    model: createOpenAI({ apiKey: imageAi.apiKey }).image(imageAi.modelId),
    prompt: imagePrompt(req),
    size: OPENAI_SIZE_BY_RATIO[req.aspectRatio] ?? "1536x1024",
    abortSignal: withTimeout(signal, 60_000),
  });
  return {
    buffer: Buffer.from(image.uint8Array),
    mimeType: normalizeImageMime(image.mediaType || "image/png"),
    modelUsed: imageAi.modelId,
  };
}

async function geminiImage(
  req: AiImageRequest,
  sourceImage: { buffer: Buffer; mimeType: string } | null,
  imageAi: UserImageAi,
  signal?: AbortSignal
): Promise<NativeImage> {
  const ratioForApi = req.aspectRatio === "21:9" ? "16:9" : req.aspectRatio;
  const parts: Array<Record<string, unknown>> = [{ text: imagePrompt(req) }];
  if (sourceImage) {
    parts.push({
      inlineData: {
        mimeType: sourceImage.mimeType,
        data: sourceImage.buffer.toString("base64"),
      },
    });
  }

  const model = imageAi.modelId;
  const res = await fetch(
    `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`,
    geminiRequestInit(
      imageAi.apiKey,
      {
        contents: [{ parts }],
        generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: ratioForApi } },
      },
      35000,
      signal
    )
  );
  if (!res.ok) {
    // Texto do provedor só serve para classificar no describeAiError; nunca vai ao cliente nem ao log
    const errText = await res.text().catch(() => "");
    throw Object.assign(new Error(errText.slice(0, 500)), { statusCode: res.status });
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> } }>;
  };
  const imgPart = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!imgPart?.inlineData?.data) throw new Error("O modelo não devolveu imagem.");
  return {
    buffer: Buffer.from(imgPart.inlineData.data, "base64"),
    mimeType: normalizeImageMime(imgPart.inlineData.mimeType || "image/png"),
    modelUsed: model,
  };
}

interface ArtDirectionSpec {
  eyebrow: string;
  headline: string;
  subheadline: string;
  badge: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  fitMode: "cover" | "contain-backdrop";
  brightness: number;
  contrast: number;
  saturate: number;
  showTextOverlay: boolean;
}

async function getArtDirection(
  req: AiImageRequest,
  hasSourceImage: boolean,
  textAi: UserTextAi | null | undefined,
  signal?: AbortSignal
): Promise<{ spec: ArtDirectionSpec; modelUsed: string }> {
  const defaultBg = sanitizeCssColor(
    req.mode === "generate" ? req.palette.secondary : req.palette.neutral,
    "#141416"
  );
  const defaultFg = sanitizeCssColor(
    req.mode === "generate" ? req.palette.secondaryFg : req.palette.primary,
    "#FFFFFF"
  );
  const defaultAccent = sanitizeCssColor(req.palette.primary, "#111827");

  const fallback: ArtDirectionSpec = {
    eyebrow: req.brandName.toUpperCase(),
    headline: req.slotLabel || `Coleção ${req.brandName}`,
    subheadline:
      req.prompt.trim() || `Seleção exclusiva em ${req.niche} com acabamento premium.`,
    badge: "EDIÇÃO ESPECIAL",
    bgColor: defaultBg,
    textColor: defaultFg,
    accentColor: defaultAccent,
    fitMode: req.mode === "resize" ? "contain-backdrop" : "cover",
    brightness: req.mode === "enhance" ? 1.05 : 1.02,
    contrast: req.mode === "enhance" ? 1.09 : 1.04,
    saturate: req.mode === "enhance" ? 1.08 : 1.03,
    showTextOverlay: req.mode === "generate" || !hasSourceImage,
  };

  if (!textAi) return { spec: fallback, modelUsed: "local-art-studio" };

  const prompt = `Você é um Diretor de Arte de e-commerce de luxo. Retorne APENAS JSON válido (sem markdown) para compor uma imagem PNG HD (${req.aspectRatio}) da loja "${req.brandName}" (nicho: ${req.niche}).
Modo solicitado: ${req.mode}. Tem imagem base: ${hasSourceImage ? "sim" : "não"}.
Pedido do consultor: "${req.prompt}"
Paleta da marca: primária=${req.palette.primary}, secundária=${req.palette.secondary}, neutra=${req.palette.neutral}.

Regras:
- Se modo for "enhance" ou "resize" e houver imagem base SEM pedido explícito de texto, defina "showTextOverlay": false para entregar fotografia limpa em alta definição.
- Se modo for "generate" ou não houver imagem base (ou o pedido pedir texto/oferta), defina "showTextOverlay": true e escreva textos curtos, elegantes e em PT-BR.
- "fitMode": use "contain-backdrop" quando o pedido pedir redimensionar/enquadrar sem cortar o produto; use "cover" para preenchimento total.

Formato JSON:
{
  "eyebrow": "string curta",
  "headline": "string até 5 palavras",
  "subheadline": "string até 12 palavras",
  "badge": "string curta",
  "bgColor": "#HEX",
  "textColor": "#HEX",
  "accentColor": "#HEX",
  "fitMode": "cover | contain-backdrop",
  "brightness": 1.05,
  "contrast": 1.08,
  "saturate": 1.06,
  "showTextOverlay": false
}`;

  try {
    const { text } = await generateText({
      model: textAi.model,
      prompt,
      temperature: 0.4,
      abortSignal: withTimeout(signal, 12000),
    });
    const parsed = (extractJsonObject(text) ?? {}) as Partial<ArtDirectionSpec>;
    return {
      spec: {
        eyebrow: parsed.eyebrow || fallback.eyebrow,
        headline: parsed.headline || fallback.headline,
        subheadline: parsed.subheadline || fallback.subheadline,
        badge: parsed.badge || fallback.badge,
        bgColor: sanitizeCssColor(parsed.bgColor, fallback.bgColor),
        textColor: sanitizeCssColor(parsed.textColor, fallback.textColor),
        accentColor: sanitizeCssColor(parsed.accentColor, fallback.accentColor),
        fitMode: parsed.fitMode === "contain-backdrop" ? "contain-backdrop" : "cover",
        brightness: Math.min(1.25, Math.max(0.85, Number(parsed.brightness) || fallback.brightness)),
        contrast: Math.min(1.25, Math.max(0.9, Number(parsed.contrast) || fallback.contrast)),
        saturate: Math.min(1.3, Math.max(0.8, Number(parsed.saturate) || fallback.saturate)),
        showTextOverlay:
          typeof parsed.showTextOverlay === "boolean"
            ? parsed.showTextOverlay
            : fallback.showTextOverlay,
      },
      modelUsed: `${textAi.modelId} + Art Studio HD`,
    };
  } catch {
    signal?.throwIfAborted();
    return { spec: fallback, modelUsed: "local-art-studio" };
  }
}

async function renderArtStudioPng(
  req: AiImageRequest,
  sourceImage: { buffer: Buffer; mimeType: string } | null,
  spec: ArtDirectionSpec,
  width: number,
  height: number,
  signal?: AbortSignal
): Promise<Buffer> {
  const dataUri = sourceImage
    ? `data:${normalizeImageMime(sourceImage.mimeType)};base64,${sourceImage.buffer.toString("base64")}`
    : null;
  const headingFont = sanitizeFontName(req.headingFont, "Montserrat");
  const bodyFont = sanitizeFontName(req.bodyFont, "Poppins");
  const isSlim = req.aspectRatio === "21:9";
  const isVertical = req.aspectRatio === "3:4";

  const filterCss = `brightness(${spec.brightness}) contrast(${spec.contrast}) saturate(${spec.saturate})`;

  let bodyHtml = "";
  if (dataUri && !spec.showTextOverlay) {
    // Clean HD upscale / smart reframe without distorting aspect ratio
    if (spec.fitMode === "contain-backdrop") {
      bodyHtml = `
        <div style="position:relative;width:100vw;height:100vh;overflow:hidden;background:${spec.bgColor};display:flex;align-items:center;justify-content:center;">
          <img src="${dataUri}" style="position:absolute;inset:-8%;width:116%;height:116%;object-fit:cover;filter:blur(42px) brightness(0.88) saturate(1.1);opacity:0.65;transform:scale(1.08);" />
          <div style="position:absolute;inset:0;background:radial-gradient(circle at center, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.28) 100%);"></div>
          <img src="${dataUri}" style="position:relative;z-index:2;max-width:92%;max-height:92%;object-fit:contain;filter:${filterCss};box-shadow:0 28px 70px rgba(0,0,0,0.28);border-radius:10px;" />
        </div>`;
    } else {
      bodyHtml = `
        <div style="position:relative;width:100vw;height:100vh;overflow:hidden;background:${spec.bgColor};">
          <img src="${dataUri}" style="width:100%;height:100%;object-fit:cover;object-position:center;filter:${filterCss};display:block;" />
          <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0.03) 0%,rgba(0,0,0,0.12) 100%);"></div>
        </div>`;
    }
  } else {
    // Editorial luxury artwork composition (with optional real product/photo inset)
    const headlineSize = isSlim ? "44px" : isVertical ? "66px" : "86px";
    const subSize = isSlim ? "20px" : isVertical ? "24px" : "28px";

    bodyHtml = `
      <div style="position:relative;width:100vw;height:100vh;overflow:hidden;background:linear-gradient(135deg, ${spec.bgColor} 0%, #0f1115 100%);color:${spec.textColor};display:flex;align-items:center;justify-content:space-between;padding:${isSlim ? "36px 88px" : isVertical ? "72px 64px" : "88px 112px"};box-sizing:border-box;${isVertical ? "flex-direction:column;justify-content:flex-end;align-items:flex-start;" : ""}">
        ${
          dataUri
            ? `<img src="${dataUri}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:${filterCss} brightness(0.76);opacity:0.86;" />
               <div style="position:absolute;inset:0;background:linear-gradient(${isVertical ? "180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.82) 100%" : "90deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.34) 55%, rgba(0,0,0,0.15) 100%"});"></div>`
            : `<div style="position:absolute;right:-120px;top:-120px;width:620px;height:620px;border-radius:999px;background:${spec.accentColor};opacity:0.22;filter:blur(80px);"></div>
               <div style="position:absolute;left:-80px;bottom:-140px;width:540px;height:540px;border-radius:999px;background:${spec.textColor};opacity:0.08;filter:blur(90px);"></div>
               <div style="position:absolute;inset:28px;border:1px solid rgba(255,255,255,0.14);pointer-events:none;"></div>`
        }
        <div style="position:relative;z-index:2;max-width:${isVertical ? "100%" : isSlim ? "68%" : "58%"};color:#ffffff;">
          <div style="display:inline-flex;align-items:center;gap:14px;font-family:'${bodyFont}',sans-serif;font-size:${isSlim ? "14px" : "17px"};font-weight:700;letter-spacing:0.24em;text-transform:uppercase;opacity:0.88;margin-bottom:${isSlim ? "10px" : "24px"};">
            <span style="display:inline-block;width:36px;height:2px;background:#ffffff;"></span>
            <span>${escapeHtml(spec.eyebrow)}</span>
          </div>
          <h1 style="margin:0 0 ${isSlim ? "8px" : "22px"} 0;font-family:'${headingFont}',Georgia,serif;font-size:${headlineSize};font-weight:300;line-height:1.02;letter-spacing:-0.02em;color:#ffffff;">${escapeHtml(spec.headline)}</h1>
          <p style="margin:0;font-family:'${bodyFont}',sans-serif;font-size:${subSize};font-weight:400;line-height:1.5;color:rgba(255,255,255,0.86);max-width:680px;">${escapeHtml(spec.subheadline)}</p>
        </div>
        ${
          !isVertical
            ? `<div style="position:relative;z-index:2;padding:16px 34px;border:1.5px solid rgba(255,255,255,0.75);font-family:'${bodyFont}',sans-serif;font-size:16px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#ffffff;backdrop-filter:blur(8px);background:rgba(0,0,0,0.22);">${escapeHtml(spec.badge)}</div>`
            : ""
        }
      </div>`;
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />
    <style>html,body{margin:0;padding:0;width:${width}px;height:${height}px;overflow:hidden;background:#111;}</style>
  </head><body>${bodyHtml}</body></html>`;

  return withBrowserSlot(
    async () => {
      const browser = await getSharedBrowser();
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
      try {
        const page = await context.newPage();
        // A arte só precisa de data: URIs e das fontes do Google; todo o resto é bloqueado
        await page.route("**", (route) =>
          isAllowedArtStudioRequest(route.request().url()) ? route.continue() : route.abort("blockedbyclient")
        );
        await page.setContent(html, { waitUntil: "load" });
        await page.waitForTimeout(150);
        return await page.screenshot({ type: "png" });
      } finally {
        await context.close().catch(() => undefined);
      }
    },
    { signal, timeoutMs: 45_000 }
  );
}

export function isAllowedArtStudioRequest(url: string): boolean {
  if (url.startsWith("data:")) return true;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (u.hostname === "fonts.googleapis.com" || u.hostname === "fonts.gstatic.com");
  } catch {
    return false;
  }
}

export async function processAiImageRequest(
  req: AiImageRequest,
  options: { signal?: AbortSignal; imageAi: UserImageAi; textAi?: UserTextAi | null }
): Promise<AiImageResult> {
  const { signal, imageAi, textAi } = options;
  if (imageAi.provider === "openai" && req.mode !== "generate") throw new AiImageModeUnsupportedError();

  const { width, height } = DIMENSIONS_BY_RATIO[req.aspectRatio] ?? DIMENSIONS_BY_RATIO["16:9"];
  const capturesDir = path.join(process.cwd(), "public", "captures");
  await fs.mkdir(capturesDir, { recursive: true });

  const sourceImage = await loadImageAsBuffer(req.sourceImageUrl, req.sourceStoreUrl, signal);
  signal?.throwIfAborted();

  // 1) Geração nativa na IA de imagem do usuário (Gemini também edita a imagem base)
  const nativeAttempt = await tryNativeImage(req, sourceImage, imageAi, signal);
  if ("buffer" in nativeAttempt) {
    const ext = nativeAttempt.mimeType.includes("jpeg")
      ? ".jpg"
      : nativeAttempt.mimeType.includes("webp")
        ? ".webp"
        : ".png";
    const hash = crypto.randomBytes(5).toString("hex");
    const filename = `${aiImageFilePrefix(req.previewId)}${Date.now()}-${hash}${ext}`;
    await fs.writeFile(path.join(capturesDir, filename), nativeAttempt.buffer);

    return {
      imageUrl: `/api/captures/${filename}`,
      width,
      height,
      engine: "ai-image",
      modelUsed: nativeAttempt.modelUsed,
    };
  }

  // 2) Fallback HD: direção de arte pela IA de texto do usuário + render Playwright
  const { spec, modelUsed } = await getArtDirection(req, Boolean(sourceImage), textAi, signal);
  const pngBuffer = await renderArtStudioPng(req, sourceImage, spec, width, height, signal);

  const hash = crypto.randomBytes(5).toString("hex");
  const filename = `${aiImageFilePrefix(req.previewId)}${Date.now()}-${hash}.png`;
  await fs.writeFile(path.join(capturesDir, filename), pngBuffer);

  return {
    imageUrl: `/api/captures/${filename}`,
    width,
    height,
    engine: "art-studio",
    modelUsed,
    notice: `${describeAiError(nativeAttempt.error)} A imagem foi montada no Art Studio (${width}×${height}).`,
  };
}
