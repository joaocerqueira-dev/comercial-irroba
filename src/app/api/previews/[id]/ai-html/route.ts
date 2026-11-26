import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  callGeminiWithTimeout,
  extractJsonObject,
  formatFriendlyAiError,
} from "@/lib/ai/architect";
import { sanitizeCustomHtmlBlock } from "@/lib/irroba-blocks/sanitize";
import { GEMINI_TEXT_MODELS } from "@/lib/layout-patterns/ai";
import { getPreviewWithBlueprint } from "@/lib/previews/repository";
import type { StoreBlueprint } from "@/lib/types/blueprint";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  prompt: z.string().trim().min(3, "Descreva o que deseja gerar (mínimo 3 caracteres).").max(2000),
  currentHtml: z.string().max(40000).optional(),
  sectionTitle: z.string().max(120).optional(),
  widthMode: z.enum(["container", "full"]).optional().default("container"),
  mode: z.enum(["generate", "refine"]).optional().default("generate"),
  themeOverride: z
    .object({
      primary: z.string().max(40).optional(),
      secondary: z.string().max(40).optional(),
      background: z.string().max(40).optional(),
      foreground: z.string().max(40).optional(),
      headingFont: z.string().max(80).optional(),
      bodyFont: z.string().max(80).optional(),
    })
    .optional(),
});

function collectStoreImageHints(bp: StoreBlueprint): string[] {
  const seen = new Set<string>();
  const add = (u?: string) => {
    if (!u || seen.has(u)) return;
    if (u.startsWith("http://") || u.startsWith("https://") || u.startsWith("/api/captures/")) {
      seen.add(u);
    }
  };
  add(bp.sections.hero.imageUrl);
  for (const s of bp.sections.heroSlides) add(s.imageUrl);
  add(bp.sections.secondaryBanner?.imageUrl);
  for (const m of bp.sections.moodBanners) add(m.imageUrl);
  for (const p of bp.products) add(p.imageUrl);
  return Array.from(seen).slice(0, 6);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let body: z.infer<typeof BodySchema>;
  try {
    const raw = await req.json();
    body = BodySchema.parse(raw);
  } catch (err) {
    const msg =
      err instanceof z.ZodError
        ? err.issues[0]?.message || "Parâmetros inválidos para geração HTML."
        : "JSON inválido na requisição.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { id } = await context.params;
  const lookup = await getPreviewWithBlueprint({ id });
  if (lookup.status === "not_found") {
    return NextResponse.json({ error: "Preview não encontrado" }, { status: 404 });
  }
  if (lookup.status === "invalid") {
    return NextResponse.json({ error: "Blueprint inválido para este preview" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY não configurada no servidor." },
      { status: 503 }
    );
  }

  const bp = lookup.blueprint;
  const theme = {
    primary: body.themeOverride?.primary || bp.theme.primaryBackground,
    secondary: body.themeOverride?.secondary || bp.theme.secondaryBackground,
    background: body.themeOverride?.background || bp.theme.bodyBackground,
    foreground: body.themeOverride?.foreground || bp.theme.bodyForeground,
    headingFont: body.themeOverride?.headingFont || bp.theme.headingFont,
    bodyFont: body.themeOverride?.bodyFont || bp.theme.bodyFont,
  };
  const images = collectStoreImageHints(bp);
  const currentHtmlSnippet = body.currentHtml?.trim() ? body.currentHtml.trim().slice(0, 12000) : "";

  const systemPrompt = [
    `Você é um especialista em UI/CRO para e-commerce brasileiro na plataforma Irroba (Tema LIME).`,
    `Sua tarefa é ${body.mode === "refine" && currentHtmlSnippet ? "REFINAR e aprimorar o HTML existente" : "CRIAR um bloco HTML elegante e responsivo"} para a loja "${bp.brand.name}" (nicho: ${bp.brand.niche}, tom: ${bp.brand.tone}).`,
    body.sectionTitle ? `Título atual da seção: "${body.sectionTitle}".` : "",
    ``,
    `Identidade Visual da Loja:`,
    `- Cor primária (destaque/botões): ${theme.primary}`,
    `- Cor secundária: ${theme.secondary}`,
    `- Fundo base: ${theme.background}`,
    `- Texto principal: ${theme.foreground}`,
    `- Fonte títulos: '${theme.headingFont}', sans-serif`,
    `- Fonte corpo: '${theme.bodyFont}', sans-serif`,
    `- Modo de largura: ${body.widthMode === "full" ? "Largura total (full-bleed)" : "Container alinhado (max-width: 1280px, margin: 0 auto)"}`,
    images.length > 0
      ? `- URLs reais de imagens da loja (use somente se fizer sentido no layout): ${images.join(" | ")}`
      : `- Não invente URLs de imagem externas quebradas; use layouts tipográficos, cards ou badges com CSS inline caso não use uma das URLs fornecidas.`,
    ``,
    `Regras Obrigatórias de Compatibilidade SunEditor & Segurança:`,
    `1. Utilize APENAS estilos inline (style="...") e tags HTML semânticas (<section>, <div>, <h2>, <h3>, <p>, <a>, <img>, <ul>, <li>, <details>, <summary>, <table>, <span>).`,
    `2. PROIBIDO usar <style>, <script>, <iframe>, <form>, <input>, classes externas não-inline ou atributos onclick/onerror/onload.`,
    `3. Layout 100% responsivo sem media queries: use display:flex; flex-wrap:wrap; gap:...; flex:1 1 260px; box-sizing:border-box; max-width:100%.`,
    `4. Garanta alto contraste entre texto e fundo e espaçamento equilibrado.`,
    `5. Se usar links (<a href="#">), estilize como botões acessíveis em português.`,
    ``,
    currentHtmlSnippet ? `HTML atual para refinar:\n\`\`\`html\n${currentHtmlSnippet}\n\`\`\`\n` : "",
    `Pedido do usuário:\n"${body.prompt}"`,
    ``,
    `Retorne APENAS um JSON válido com esta estrutura exata:`,
    `{`,
    `  "html": "<div style=\\"...\\">...</div>",`,
    `  "summary": "Resumo curto em português do que foi criado ou alterado (até 140 chars)",`,
    `  "suggestedTitle": "Título curto para a seção (até 45 chars)"`,
    `}`,
  ]
    .filter(Boolean)
    .join("\n");

  const ai = new GoogleGenAI({ apiKey });
  let lastErrorMsg = "";

  for (const model of GEMINI_TEXT_MODELS) {
    try {
      const response = await callGeminiWithTimeout(
        ai,
        model,
        [{ text: systemPrompt }],
        28_000,
        req.signal
      );
      const rawText = response.text?.trim();
      if (!rawText) {
        lastErrorMsg = `Resposta vazia do modelo ${model}`;
        continue;
      }

      const parsed = extractJsonObject(rawText);
      const rawHtml = typeof parsed.html === "string" ? parsed.html : "";
      const cleanHtml = sanitizeCustomHtmlBlock(rawHtml);
      if (!cleanHtml) {
        lastErrorMsg = `HTML inválido ou vazio retornado por ${model}`;
        continue;
      }

      const summary =
        typeof parsed.summary === "string" && parsed.summary.trim()
          ? parsed.summary.trim().slice(0, 180)
          : "Conteúdo HTML atualizado com identidade da loja.";
      const suggestedTitle =
        typeof parsed.suggestedTitle === "string" && parsed.suggestedTitle.trim()
          ? parsed.suggestedTitle.trim().slice(0, 60)
          : body.sectionTitle || "Bloco HTML";

      return NextResponse.json({
        html: cleanHtml,
        summary,
        suggestedTitle,
      });
    } catch (err) {
      lastErrorMsg = err instanceof Error ? err.message : String(err);
    }
  }

  return NextResponse.json(
    {
      error: formatFriendlyAiError(
        lastErrorMsg || "Não foi possível gerar o conteúdo HTML com IA no momento."
      ),
    },
    { status: 503 }
  );
}
