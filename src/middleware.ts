import { NextResponse, type NextRequest } from "next/server";

/**
 * Exige o cookie de sessão na área interna (home, estúdio, admin, conta e API).
 * Aqui só confere a presença: o middleware roda no Edge e não acessa o banco.
 * A validação real fica em requireUser/requirePageUser.
 * Públicos: /preview/[slug], /render/[slug], /api/captures/*, /api/share/*, /api/health e /api/auth/login
 * (preview, render, captura mobile e share checam o acesso do cliente na própria rota).
 */
export function isPublicPath(pathname: string): boolean {
  return (
    pathname.startsWith("/preview/") ||
    pathname.startsWith("/render/") ||
    pathname.startsWith("/api/captures/") ||
    pathname.startsWith("/api/share/") ||
    pathname === "/api/health" ||
    pathname === "/api/auth/login"
  );
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();
  // "session" = SESSION_COOKIE; session.ts importa prisma/node:crypto, impróprios para o Edge
  const token = req.cookies.get("session")?.value;
  if (token) {
    const res = NextResponse.next();
    // sliding: renova o cookie do navegador (a sessão no banco já renova); login/logout/password mexem no cookie sozinhos
    if (!pathname.startsWith("/api/auth/")) {
      res.cookies.set("session", token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 3600,
        secure: process.env.NODE_ENV === "production",
      });
    }
    return res;
  }
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
