import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createRateLimiter, getClientIp, tooManyRequests } from "@/lib/net/rate-limit";
import { resolveShareAccess, shareCookieName, withShareSecret } from "@/lib/share/access";
import { STATUS_BY_RESPONSE, type ResponseType } from "@/lib/share/responses";

export const runtime = "nodejs";

const limiter = createRateLimiter();
const PER_MIN = 10;
const ALREADY = "Esta proposta já foi respondida.";

const STALE = "A proposta foi atualizada. Recarregue a página para ver a versão nova.";

const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

/** Cliente (só com cookie de senha válido) aprova, pede ajustes ou recusa a proposta. */
export function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  return withShareSecret(async () => {
    const { slug } = await ctx.params;
    const limited = limiter.take(`${getClientIp(req)}:${slug}`, PER_MIN);
    if (!limited.ok) return tooManyRequests(limited.retryAfterSec);

    const p = await prisma.storePreview.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        ownerId: true,
        legacyPublic: true,
        shareExpiresAt: true,
        sharePasswordHash: true,
        shareStatus: true,
        contentVersion: true,
      },
    });
    if (!p) return NextResponse.json({ error: "Proposta indisponível" }, { status: 404 });

    // Sessão ignorada de propósito: só quem destravou o link como cliente responde
    const access = resolveShareAccess(p, { cookieValue: req.cookies.get(shareCookieName(slug))?.value, user: null });
    if (access === "expired") {
      return NextResponse.json({ error: "Proposta expirada, fale com seu comercial" }, { status: 410 });
    }
    if (access !== "granted") return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const type = body?.type as ResponseType;
    if (typeof type !== "string" || !Object.hasOwn(STATUS_BY_RESPONSE, type)) return bad("Tipo de resposta inválido.");
    const version = body?.contentVersion;
    if (typeof version !== "number" || !Number.isInteger(version)) return bad("Versão da proposta inválida.");
    const clientName = typeof body?.clientName === "string" ? body.clientName.trim() : "";
    if (clientName.length < 1 || clientName.length > 80) return bad("Informe seu nome (até 80 caracteres).");
    const raw = body?.message;
    if (raw != null && typeof raw !== "string") return bad("Mensagem inválida.");
    const message = raw?.trim() || null;
    if (message && message.length > 2000) return bad("Mensagem muito longa (máx. 2000 caracteres).");
    if (type === "ajustes" && (message?.length ?? 0) < 3) return bad("Descreva os ajustes que você quer.");

    if (p.shareStatus !== "pendente") return NextResponse.json({ error: ALREADY }, { status: 409 });

    if (version !== p.contentVersion) return NextResponse.json({ error: STALE }, { status: 409 });

    const shareStatus = STATUS_BY_RESPONSE[type];
    const response = await prisma.$transaction(async (tx) => {
      const { count } = await tx.storePreview.updateMany({
        where: { id: p.id, shareStatus: "pendente", contentVersion: version },
        data: { shareStatus },
      });
      if (count === 0) return null;
      return tx.clientResponse.create({
        data: { previewId: p.id, type, clientName, message, contentVersion: version },
      });
    });
    if (!response) return NextResponse.json({ error: ALREADY }, { status: 409 });
    return NextResponse.json({ shareStatus, response }, { status: 201 });
  });
}
