import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ExtractedStoreDataSchema } from "@/lib/types/blueprint";
import { buildStoreBlueprint } from "@/lib/ai/architect";
import { getUserTextAi } from "@/lib/ai/providers";
import { limitAuthenticated } from "@/lib/net/rate-limit";
import { canAccessPreview, requireUser } from "@/lib/auth/guard";

export const runtime = "nodejs";
/** Só IA: uma chamada de até 35 s, mais a leitura das imagens (folga para provedores lentos). */
export const maxDuration = 150;
const REANALYZE_BUDGET_MS = 140_000;

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireUser(req);
  if (user instanceof Response) return user;
  // Só IA (sem Playwright): entra no rate limit, mas não no semáforo do navegador
  const limited = limitAuthenticated(req, "reanalyze");
  if (limited) return limited;

  const { id } = await context.params;
  const preview = await prisma.storePreview.findUnique({ where: { id } });

  if (!preview || !canAccessPreview(user, preview.ownerId) || !preview.extractedData) {
    return NextResponse.json(
      { error: "Dados extraídos não encontrados para reanálise" },
      { status: 404 }
    );
  }

  const parsedExtracted = ExtractedStoreDataSchema.safeParse(preview.extractedData);
  if (!parsedExtracted.success) {
    return NextResponse.json(
      { error: "Formato de dados extraídos incompatível. Gere um novo preview da URL." },
      { status: 400 }
    );
  }

  // Quem executa paga: a IA é a do usuário da requisição, não a do dono da proposta
  const ai = await getUserTextAi(user.id);
  if (!ai) {
    return NextResponse.json({ error: "Configure sua IA para gerar com IA" }, { status: 400 });
  }

  let result: Awaited<ReturnType<typeof buildStoreBlueprint>>;
  try {
    // Cliente que desiste (fecha a aba, cancela) ou estouro do orçamento aborta a chamada à IA
    const signal = AbortSignal.any([req.signal, AbortSignal.timeout(REANALYZE_BUDGET_MS)]);
    result = await buildStoreBlueprint(parsedExtracted.data, { signal, ai });
  } catch (err) {
    console.error("[reanalyze] Falha na reanálise:", err);
    return NextResponse.json(
      { error: "Não foi possível reanalisar agora. O layout atual foi preservado sem alterações.", preserved: true },
      { status: 503 }
    );
  }
  const { blueprint, mode, modelUsed, aiError } = result;

  if (mode !== "ai") {
    return NextResponse.json(
      {
        error: `${aiError || "IA temporariamente indisponível."} O layout atual foi preservado sem alterações.`,
        preserved: true,
      },
      { status: 503 }
    );
  }

  // Não grava: o estúdio decide (substituir tudo / só paleta) e salva via PATCH.
  return NextResponse.json({
    blueprint,
    mode,
    modelUsed: modelUsed ?? null,
    aiError: aiError ?? null,
  });
}
