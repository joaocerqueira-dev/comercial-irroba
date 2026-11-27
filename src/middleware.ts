import { NextResponse, type NextRequest } from "next/server";

/**
 * Exige o cookie de sessão na área interna (home, estúdio, admin, conta e API).
 * Aqui só confere a presença: o middleware roda no Edge e não acessa o banco.
 * A validação real fica em requireUser/requirePageUser.
 * Públicos: /preview/[slug], /render/[slug], /api/captures/*, /api/health e /api/auth/login.
 */
export function isPublicPath(pathname: string): boolean {
  return (
    pathname.startsWith("/preview/") ||
    pathname.startsWith("/render/") ||
    pathname.startsWith("/api/captures/") ||
    pathname === "/api/health" ||
    pathname === "/api/auth/login"
  );
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();
  // "session" = SESSION_COOKIE; session.ts importa prisma/node:crypto, impróprios para o Edge
  if (req.cookies.get("session")?.value) return NextResponse.next();
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/", "/studio/:path*", "/admin/:path*", "/conta/:path*", "/api/:path*"],
};
