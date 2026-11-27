import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guard";
import { assertPublicHttpUrl } from "@/lib/net/safe-url";
import { decryptApiKey, encryptApiKey } from "@/lib/ai/secret-box";
import { IMAGE_PROVIDERS, type AiPurpose } from "@/lib/ai/providers";

const Body = z.object({
  purpose: z.enum(["texto", "imagem"]),
  provider: z.enum(["openai", "anthropic", "google", "openai-compatible"]),
  apiKey: z.string().trim().min(8).max(400).optional(),
  model: z.string().trim().max(120).optional(),
  baseUrl: z.string().trim().max(500).optional(),
  reuseText: z.literal(true).optional(),
});

const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

type Row = { provider: string; model: string | null; baseUrl: string | null; last4: string; updatedAt: Date; apiKeyEncrypted: string };
function view(r: Row) {
  let broken: true | undefined;
  try {
    decryptApiKey(r.apiKeyEncrypted);
  } catch {
    broken = true;
  }
  return {
    provider: r.provider,
    model: r.model,
    baseUrl: r.baseUrl,
    last4: r.last4,
    updatedAt: r.updatedAt.toISOString(),
    ...(broken ? { broken } : {}),
  };
}

const find = (userId: string, purpose: AiPurpose) =>
  prisma.aiCredential.findUnique({ where: { userId_purpose: { userId, purpose } } });

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof Response) return user;
  const [t, i] = await Promise.all([find(user.id, "texto"), find(user.id, "imagem")]);
  return NextResponse.json({ texto: t && view(t), imagem: i && view(i) });
}

export async function PUT(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof Response) return user;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad("Dados inválidos.");
  const b = parsed.data;
  const { purpose, provider } = b;
  if (purpose === "imagem" && !(IMAGE_PROVIDERS as readonly string[]).includes(provider))
    return bad("A IA de imagem aceita só Google ou OpenAI.");

  let apiKey = b.apiKey;
  if (b.reuseText) {
    if (purpose !== "imagem") return bad("Dados inválidos.");
    const t = await find(user.id, "texto");
    if (!t || t.provider !== provider || (t.provider !== "google" && t.provider !== "openai"))
      return bad("A IA de texto não pode ser reaproveitada para imagens.");
    try {
      apiKey = decryptApiKey(t.apiKeyEncrypted);
    } catch {
      return bad("Salve a chave da IA de texto de novo.");
    }
  }

  const current = await find(user.id, purpose);
  let baseUrl: string | null = null;
  if (provider === "openai-compatible") {
    if (!b.model) return bad("Informe o modelo.");
    try {
      baseUrl = (await assertPublicHttpUrl(b.baseUrl ?? "")).toString();
      if (!baseUrl.startsWith("https://")) throw new Error();
    } catch {
      return bad("Informe um endereço https público válido.");
    }
  }
  if (!apiKey && !current) return bad("Informe a chave da API.");

  const data = {
    provider,
    baseUrl,
    model: b.model || null,
    ...(apiKey ? { apiKeyEncrypted: encryptApiKey(apiKey), last4: apiKey.slice(-4) } : {}),
  };
  const row = await prisma.aiCredential.upsert({
    where: { userId_purpose: { userId: user.id, purpose } },
    update: data,
    create: { userId: user.id, purpose, ...data, apiKeyEncrypted: data.apiKeyEncrypted!, last4: data.last4! },
  });
  return NextResponse.json(view(row));
}

export async function DELETE(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof Response) return user;
  const purpose = req.nextUrl.searchParams.get("purpose");
  if (purpose !== "texto" && purpose !== "imagem") return bad("Informe purpose.");
  await prisma.aiCredential.deleteMany({ where: { userId: user.id, purpose } });
  return new Response(null, { status: 204 });
}
