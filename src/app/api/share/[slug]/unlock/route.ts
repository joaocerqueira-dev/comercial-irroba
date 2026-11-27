import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOptionalUser } from "@/lib/auth/guard";
import { verifyPassword } from "@/lib/auth/password";
import { createRateLimiter, getClientIp, tooManyRequests } from "@/lib/net/rate-limit";
import {
  getShareSecret,
  resolveShareAccess,
  shareCookieHeader,
  signShareCookie,
  withShareSecret,
} from "@/lib/share/access";

export const runtime = "nodejs";

const limiter = createRateLimiter();
const ATTEMPTS_PER_MIN = 5;

const notFound = () => NextResponse.json({ error: "Proposta indisponível" }, { status: 404 });

/** Cliente digita a senha do link: grava o cookie `share_<slug>` válido até o fim do prazo. */
export function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  return withShareSecret(async () => {
    const { slug } = await ctx.params;
    const limited = limiter.take(`${getClientIp(req)}:${slug}`, ATTEMPTS_PER_MIN);
    if (!limited.ok) return tooManyRequests(limited.retryAfterSec);
    getShareSecret();

    const body = (await req.json().catch(() => null)) as { password?: unknown } | null;
    const password = typeof body?.password === "string" ? body.password : "";
    const p = await prisma.storePreview.findUnique({
      where: { slug },
      select: { slug: true, ownerId: true, legacyPublic: true, shareExpiresAt: true, sharePasswordHash: true },
    });
    if (!p) return notFound();

    const access = resolveShareAccess(p, { user: await getOptionalUser(req) });
    if (access === "owner" || access === "public-legacy") return NextResponse.json({ ok: true });
    if (access === "unavailable") return notFound();
    if (access === "expired") {
      return NextResponse.json({ error: "Proposta expirada, fale com seu comercial" }, { status: 410 });
    }
    // needs-password: shareExpiresAt e sharePasswordHash existem
    if (!(await verifyPassword(password, p.sharePasswordHash!))) {
      return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
    }
    const value = signShareCookie(slug, p.sharePasswordHash!, p.shareExpiresAt!);
    return NextResponse.json({ ok: true }, { headers: { "Set-Cookie": shareCookieHeader(slug, value, p.shareExpiresAt!) } });
  });
}
