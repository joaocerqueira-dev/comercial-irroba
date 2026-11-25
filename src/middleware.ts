import { NextResponse, type NextRequest } from "next/server";

/**
 * Basic auth para a área interna (home, estúdio e API).
 * Públicos: /preview/[slug], /render/[slug], /api/captures/* e /api/health.
 * Sem ADMIN_USER/ADMIN_PASS: libera em desenvolvimento e bloqueia em produção.
 */
export function isPublicPath(pathname: string): boolean {
  return (
    pathname.startsWith("/preview/") ||
    pathname.startsWith("/render/") ||
    pathname.startsWith("/api/captures/") ||
    pathname === "/api/health"
  );
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function checkBasicAuth(
  header: string | null,
  user: string | undefined,
  pass: string | undefined,
  nodeEnv: string | undefined
): "ok" | "unauthorized" | "misconfigured" {
  if (!user || !pass) return nodeEnv === "production" ? "misconfigured" : "ok";
  if (!header?.startsWith("Basic ")) return "unauthorized";
  let decoded = "";
  try {
    decoded = atob(header.slice(6).trim());
  } catch {
    return "unauthorized";
  }
  const sep = decoded.indexOf(":");
  if (sep < 0) return "unauthorized";
  return safeEqual(decoded.slice(0, sep), user) && safeEqual(decoded.slice(sep + 1), pass)
    ? "ok"
    : "unauthorized";
}

export function middleware(req: NextRequest) {
  if (isPublicPath(req.nextUrl.pathname)) return NextResponse.next();
  const result = checkBasicAuth(
    req.headers.get("authorization"),
    process.env.ADMIN_USER,
    process.env.ADMIN_PASS,
    process.env.NODE_ENV
  );
  if (result === "ok") return NextResponse.next();
  if (result === "misconfigured") {
    return new NextResponse("Acesso bloqueado: defina ADMIN_USER e ADMIN_PASS.", { status: 503 });
  }
  return new NextResponse("Autenticação necessária", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Irroba Preview", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/", "/studio/:path*", "/api/:path*"],
};
