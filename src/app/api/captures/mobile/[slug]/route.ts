import { NextRequest, NextResponse } from "next/server";
import { getCachedMobileScreenshots } from "@/lib/scraper/mobile-screenshot";

export const runtime = "nodejs";

const SAFE_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,120}$/i;

/**
 * Rota pública (usada por /preview/[slug]): só serve a captura mobile em cache.
 * Nunca dispara o navegador. A captura acontece no POST /api/previews/generate e a
 * recaptura sob demanda na rota autenticada POST /api/previews/[id]/mobile-capture.
 * Não há POST aqui (o Next responde 405).
 */
export async function GET(_req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!SAFE_SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "Slug inválido." }, { status: 400 });
  }
  const cached = await getCachedMobileScreenshots(slug);
  if (!cached) {
    return NextResponse.json({ error: "Captura mobile não disponível." }, { status: 404 });
  }
  return NextResponse.json(cached);
}
