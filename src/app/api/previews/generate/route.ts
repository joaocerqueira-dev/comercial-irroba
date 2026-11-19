import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { assertPublicHttpUrl, UnsafeUrlError } from "@/lib/net/safe-url";
import { prisma } from "@/lib/db";
import { extractStoreFromUrl } from "@/lib/scraper/store-extractor";
import { buildStoreBlueprint } from "@/lib/ai/architect";
import { processAiImageRequest } from "@/lib/ai/image-studio";
import { compileIrrobaExport } from "@/lib/irroba-blocks/compiler";

export const runtime = "nodejs";
/** Orçamento total da geração (extração + IA + imagem). */
export const maxDuration = 300;
const GENERATION_BUDGET_MS = 270_000;

const GenerateRequestSchema = z.object({
  url: z.string().min(4, "Informe a URL da loja"),
  sellerWhatsapp: z.string().optional(),
});

function formatFriendlyScrapeError(raw: string): string {
  const cleaned = raw.split(/\nCall log:/i)[0]?.split(/\n\s*at\s+/)[0]?.trim() || raw;
  if (/ERR_NAME_NOT_RESOLVED|ENOTFOUND/i.test(cleaned)) {
    return "Não foi possível encontrar este domínio. Verifique se o endereço do site foi digitado corretamente.";
  }
  if (/ERR_CONNECTION_REFUSED|ERR_CONNECTION_RESET|ERR_CONNECTION_TIMED_OUT|Timeout/i.test(cleaned)) {
    return "O site demorou demais para responder ou recusou a conexão. Tente novamente em instantes.";
  }
  if (/ERR_CERT_|SSL|TLS/i.test(cleaned)) {
    return "O site apresentou um erro de certificado de segurança (HTTPS/SSL).";
  }
  return "Não foi possível acessar a loja informada. Verifique a URL e tente novamente.";
}

function slugifyHostname(rawUrl: string): string {
  try {
    const u = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
    const base = u.hostname
      .replace(/^www\./, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
    const suffix = crypto.randomBytes(3).toString("hex");
    return `${base || "loja"}-${suffix}`;
  } catch {
    return `loja-${crypto.randomBytes(4).toString("hex")}`;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = GenerateRequestSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: parsed.error.issues[0]?.message ?? "URL inválida" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const normalizedUrl = parsed.data.url.startsWith("http")
    ? parsed.data.url.trim()
    : `https://${parsed.data.url.trim()}`;

  try {
    await assertPublicHttpUrl(normalizedUrl);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof UnsafeUrlError ? err.message : "URL inválida" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const slug = slugifyHostname(normalizedUrl);
  const sellerWhatsapp = parsed.data.sellerWhatsapp?.replace(/\D/g, "") || null;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      let recordId: string | null = null;
      // Aborta se o cliente cancelar (req.signal) ou se estourar o orçamento global
      const budget = AbortSignal.any([req.signal, AbortSignal.timeout(GENERATION_BUDGET_MS)]);
      let closed = false;
      const safeSend = (event: string, data: Record<string, unknown>) => {
        if (closed) return;
        try {
          sendEvent(event, data);
        } catch {
          closed = true;
        }
      };

      try {
        const initialRecord = await prisma.storePreview.create({
          data: {
            slug,
            sourceUrl: normalizedUrl,
            storeName: new URL(normalizedUrl).hostname.replace(/^www\./, ""),
            sellerWhatsapp,
            status: "processing",
          },
        });
        recordId = initialRecord.id;

        safeSend("progress", {
          step: "extract",
          message: "Analisando loja original, capturando screenshot e extraindo produtos...",
          progress: 25,
        });

        const extracted = await extractStoreFromUrl(normalizedUrl, slug, {
          signal: budget,
          onProgress: (p) =>
            safeSend("progress", {
              step: p.step,
              message: p.message,
              progress: Math.round(25 + p.fraction * 35),
            }),
        });
        budget.throwIfAborted();

        const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY?.trim());
        safeSend("progress", {
          step: "architect",
          message: hasGeminiKey
            ? `Plataforma: ${extracted.detectedPlatform}. Analisando identidade visual com Gemini 3.5 Flash...`
            : `Plataforma: ${extracted.detectedPlatform}. Montando layout adaptado ao Tema LIME da Irroba...`,
          progress: 65,
        });

        const { blueprint, mode, modelUsed } = await buildStoreBlueprint(extracted, { signal: budget });
        budget.throwIfAborted();

        // Ensure hero banner always has a valid high-resolution image (AI fallback if missing)
        const firstHero = blueprint.sections.heroSlides[0];
        if (!blueprint.sections.hero.imageUrl || (firstHero && !firstHero.imageUrl)) {
          safeSend("progress", {
            step: "media",
            message: "Gerando arte de banner em alta definição com IA para completar o preview...",
            progress: 82,
          });
          try {
            const generatedHero = await processAiImageRequest({
              previewId: initialRecord.id,
              prompt: `Banner principal sofisticado de lançamento para ${blueprint.brand.name} (${blueprint.brand.niche})`,
              mode: "generate",
              aspectRatio: "16:9",
              sourceStoreUrl: normalizedUrl,
              slotLabel: blueprint.sections.hero.headline,
              brandName: blueprint.brand.name,
              niche: blueprint.brand.niche,
              headingFont: blueprint.theme.headingFont,
              bodyFont: blueprint.theme.bodyFont,
              palette: {
                primary: blueprint.theme.primaryBackground,
                primaryFg: blueprint.theme.primaryForeground,
                secondary: blueprint.theme.secondaryBackground,
                secondaryFg: blueprint.theme.secondaryForeground,
                neutral: blueprint.theme.neutralBackground,
              },
            });
            blueprint.sections.hero.imageUrl = generatedHero.imageUrl;
            if (firstHero) {
              firstHero.imageUrl = generatedHero.imageUrl;
              firstHero.mode = "artwork";
            }
          } catch {
            // Keep existing fallback cleanly
          }
        }

        safeSend("progress", {
          step: "compile",
          message:
            mode === "gemini"
              ? `Identidade visual refinada (${modelUsed || "gemini-3.5-flash"}). Compilando blocos Irroba...`
              : "Compilando preview interativo e blocos low-code (SunEditor + LIME)...",
          progress: 90,
        });

        budget.throwIfAborted();
        const compiledExport = compileIrrobaExport(blueprint);

        const updated = await prisma.storePreview.update({
          where: { id: initialRecord.id },
          data: {
            storeName: blueprint.brand.name,
            detectedPlatform: extracted.detectedPlatform,
            generationMode: mode,
            status: "ready",
            screenshotPath: extracted.screenshotPath ?? null,
            extractedData: extracted as object,
            blueprint: blueprint as object,
            compiledExport: compiledExport as object,
          },
        });

        safeSend("done", {
          id: updated.id,
          slug: updated.slug,
          storeName: updated.storeName,
          detectedPlatform: updated.detectedPlatform,
          generationMode: updated.generationMode,
          progress: 100,
        });
      } catch (err) {
        const rawMessage = err instanceof Error ? err.message : "Falha inesperada ao analisar a loja";
        const friendlyMessage = req.signal.aborted
          ? "Geração cancelada."
          : budget.aborted
            ? "A geração passou do tempo máximo. Tente novamente."
            : formatFriendlyScrapeError(rawMessage);
        console.error("[generate] Erro ao analisar loja:", rawMessage);
        if (recordId) {
          await prisma.storePreview
            .delete({ where: { id: recordId } })
            .catch(() => undefined);
        }
        safeSend("error", { message: friendlyMessage });
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          // stream já fechado pelo cliente
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
