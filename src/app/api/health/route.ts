import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Healthcheck público (sem auth) usado pelo docker-compose. Não expõe nada além de ok. */
export function GET() {
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
