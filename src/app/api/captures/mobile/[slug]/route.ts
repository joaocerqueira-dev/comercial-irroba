import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCachedMobileScreenshots } from "@/lib/scraper/mobile-screenshot";
import { requestCanView, withShareSecret } from "@/lib/share/access";

export const runtime = "nodejs";

const SAFE_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,120}$/i;

/**
 * Usada por /preview/[slug]: só serve a captura mobile em cache, para quem pode ver a proposta.
 * Nunca dispara o navegador. A captura acontece no POST /api/previews/generate e a
 * recaptura sob demanda na rota autenticada POST /api/previews/[id]/mobile-capture.
 * Não há POST aqui (o Next responde 405).
 */
export function GET(req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  return withShareSecret(async () => {
    const { slug } = await context.params;
    if (!SAFE_SLUG_RE.test(slug)) {
      return NextResponse.json({ error: "Slug inválido." }, { status: 400 });
    }
    const unavailable = () => NextResponse.json({ error: "Captura mobile não disponível." }, { status: 404 });
    const cached = await getCachedMobileScreenshots(slug);
    if (!cached) return unavailable();
    const p = await prisma.storePreview.findUnique({
      where: { slug },
      select: { slug: true, ownerId: true, legacyPublic: true, shareExpiresAt: true, sharePasswordHash: true },
    });
    // Sem acesso: mesmo 404 de captura inexistente
    if (!p || !(await requestCanView(req, p))) return unavailable();
    return NextResponse.json(cached);
  });
}
