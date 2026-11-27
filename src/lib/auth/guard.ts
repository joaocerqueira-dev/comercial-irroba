import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getUserFromToken, SESSION_COOKIE, type AuthUser } from "@/lib/auth/session";

function tokenFromRequest(req: Request): string | undefined {
  const prefix = `${SESSION_COOKIE}=`;
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const p = part.trim();
    if (p.startsWith(prefix)) return p.slice(prefix.length);
  }
  return undefined;
}

/** Devolve o usuário logado ou uma Response de erro (401/403). */
export async function requireUser(
  req: Request,
  opts: { allowMustChange?: boolean } = {},
): Promise<AuthUser | Response> {
  const user = await getUserFromToken(tokenFromRequest(req));
  if (!user) return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  if (user.mustChangePassword && !opts.allowMustChange) {
    return NextResponse.json(
      { error: "Troque sua senha para continuar.", code: "MUST_CHANGE_PASSWORD" },
      { status: 403 },
    );
  }
  return user;
}

export async function requireAdmin(req: Request): Promise<AuthUser | Response> {
  const r = await requireUser(req);
  if (r instanceof Response) return r;
  if (r.role !== "admin") return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });
  return r;
}

export function canAccessPreview(user: AuthUser, ownerId: string | null): boolean {
  return user.role === "admin" || (ownerId !== null && ownerId === user.id);
}

/** Para Server Components: redireciona/404 em vez de devolver Response. */
export async function requirePageUser(opts: { admin?: boolean } = {}): Promise<AuthUser> {
  const user = await getUserFromToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/conta/senha");
  if (opts.admin && user.role !== "admin") notFound();
  return user;
}
