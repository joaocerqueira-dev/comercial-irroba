import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { extractStoreFromUrl } from "@/lib/scraper/store-extractor";
import { buildStoreBlueprint } from "@/lib/ai/architect";
import { compileIrrobaExport } from "@/lib/irroba-blocks/compiler";

const GenerateRequestSchema = z.object({
  url: z.string().min(4, "Informe a URL da loja"),
  sellerWhatsapp: z.string().optional(),
});

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

  const slug = slugifyHostname(normalizedUrl);
  const sellerWhatsapp = parsed.data.sellerWhatsapp?.replace(/\D/g, "") || null;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      let recordId: string | null = null;

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

        sendEvent("progress", {
          step: "extract",
          message: "Analisando loja original, capturando screenshot e extraindo produtos...",
          progress: 25,
        });

        const extracted = await extractStoreFromUrl(normalizedUrl, slug);

        sendEvent("progress", {
          step: "architect",
          message: `Plataforma detectada: ${extracted.detectedPlatform}. Montando layout adaptado ao Tema LIME da Irroba...`,
          progress: 65,
        });

        const { blueprint, mode } = await buildStoreBlueprint(extracted);

        sendEvent("progress", {
          step: "compile",
          message: "Compilando preview interativo e blocos low-code (SunEditor + LIME)...",
          progress: 90,
        });

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

        sendEvent("done", {
          id: updated.id,
          slug: updated.slug,
          storeName: updated.storeName,
          detectedPlatform: updated.detectedPlatform,
          generationMode: updated.generationMode,
          progress: 100,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Falha inesperada ao analisar a loja";
        if (recordId) {
          await prisma.storePreview
            .update({
              where: { id: recordId },
              data: { status: "error", errorMessage: message },
            })
            .catch(() => undefined);
        }
        sendEvent("error", { message });
      } finally {
        controller.close();
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
