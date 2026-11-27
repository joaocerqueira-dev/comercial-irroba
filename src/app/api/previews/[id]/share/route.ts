import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { limitAuthenticated } from "@/lib/net/rate-limit";
import { canAccessPreview, requireUser } from "@/lib/auth/guard";
import { hashPassword, suggestSharePassword } from "@/lib/auth/password";

const DAY = 86_400_000;
const MAX_DAYS = 180;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const Body = z
  .object({
    days: z.union([z.literal(7), z.literal(15), z.literal(30)]).optional(),
    expiresAt: z.string().optional(),
    password: z.string().min(4).max(64).optional(),
  })
  .refine((b) => (b.days === undefined) !== (b.expiresAt === undefined), {
    message: "Informe days ou expiresAt (apenas um).",
  });

/** Data simples = fim do dia em America/Sao_Paulo (UTC-3). */
function parseExpiresAt(s: string): Date | null {
  const d = new Date(DATE_ONLY.test(s) ? `${s}T23:59:59-03:00` : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

type Ctx = { params: Promise<{ id: string }> };

/** requireUser → limiter → carrega → canAccessPreview. Devolve Response ou a proposta. */
async function guard(req: NextRequest, ctx: Ctx, include?: object) {
  const user = await requireUser(req);
  if (user instanceof Response) return user;
  const limited = limitAuthenticated(req, "share");
  if (limited) return limited;
  const { id } = await ctx.params;
  const preview = await prisma.storePreview.findUnique({ where: { id }, ...(include ? { include } : {}) });
  if (!preview || !canAccessPreview(user, preview.ownerId)) {
    return NextResponse.json({ error: "Preview não encontrado" }, { status: 404 });
  }
  return preview;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const p = await guard(req, ctx, { responses: { orderBy: { createdAt: "desc" } } });
  if (p instanceof Response) return p;
  const responses = ((p as unknown as { responses?: Record<string, unknown>[] }).responses ?? []).map((r) => ({
    id: r.id,
    type: r.type,
    clientName: r.clientName,
    message: r.message,
    contentVersion: r.contentVersion,
    createdAt: r.createdAt,
    seenAt: r.seenAt,
  }));
  return NextResponse.json({
    shareExpiresAt: p.shareExpiresAt,
    hasPassword: !!p.sharePasswordHash,
    legacyPublic: p.legacyPublic,
    shareStatus: p.shareStatus,
    contentVersion: p.contentVersion,
    responses,
  });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const p = await guard(req, ctx);
  if (p instanceof Response) return p;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Prazo ou senha inválidos." }, { status: 400 });
  }
  const { days, expiresAt, password } = parsed.data;
  const now = Date.now();
  const exp = days !== undefined ? new Date(now + days * DAY) : parseExpiresAt(expiresAt!);
  if (!exp || exp.getTime() <= now || exp.getTime() > now + MAX_DAYS * DAY) {
    return NextResponse.json(
      { error: `A validade deve ser futura e de no máximo ${MAX_DAYS} dias.` },
      { status: 400 }
    );
  }
  const plain = password ?? suggestSharePassword();
  await prisma.storePreview.update({
    where: { id: p.id },
    data: { shareExpiresAt: exp, sharePasswordHash: await hashPassword(plain), legacyPublic: false },
  });
  return NextResponse.json({ url: `/preview/${p.slug}`, expiresAt: exp.toISOString(), password: plain });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const p = await guard(req, ctx);
  if (p instanceof Response) return p;
  await prisma.storePreview.update({
    where: { id: p.id },
    data: { shareExpiresAt: null, sharePasswordHash: null, legacyPublic: false },
  });
  return NextResponse.json({ ok: true });
}
