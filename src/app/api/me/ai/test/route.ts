import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guard";
import { limitAuthenticated } from "@/lib/net/rate-limit";
import { assertPublicHttpUrl } from "@/lib/net/safe-url";
import { decryptApiKey } from "@/lib/ai/secret-box";
import { buildTextModel, type AiProvider } from "@/lib/ai/providers";
import { describeAiError } from "@/lib/ai/errors";

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof Response) return user;
  const limited = limitAuthenticated(req, "ai-test");
  if (limited) return limited;
  const { purpose } = (await req.json().catch(() => ({}))) as { purpose?: string };
  if (purpose !== "texto" && purpose !== "imagem")
    return NextResponse.json({ error: "Informe purpose." }, { status: 400 });

  const row = await prisma.aiCredential.findUnique({ where: { userId_purpose: { userId: user.id, purpose } } });
  if (!row) return NextResponse.json({ ok: false, error: "Configure sua IA primeiro." });
  try {
    const provider = row.provider as AiProvider;
    if (provider === "openai-compatible") await assertPublicHttpUrl(row.baseUrl ?? "");
    const ai = buildTextModel({
      provider,
      apiKey: decryptApiKey(row.apiKeyEncrypted),
      // imagem: mesma chave, modelo de texto padrão do provedor
      model: purpose === "texto" ? row.model : null,
      baseUrl: row.baseUrl,
    });
    await generateText({
      model: ai.model,
      prompt: "Responda apenas: OK",
      maxOutputTokens: 16,
      abortSignal: AbortSignal.timeout(20_000),
    });
    return NextResponse.json({ ok: true, model: ai.modelId });
  } catch (err) {
    const error = describeAiError(err);
    console.warn(`[ia] teste de conexão falhou (${purpose}): ${error}`);
    return NextResponse.json({ ok: false, error });
  }
}
