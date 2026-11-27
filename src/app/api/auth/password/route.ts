import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { limitAuthenticated } from "@/lib/net/rate-limit";
import { requireUser } from "@/lib/auth/guard";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, deleteUserSessions, sessionCookieHeader } from "@/lib/auth/session";

const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

export async function POST(req: Request) {
  const user = await requireUser(req, { allowMustChange: true });
  if (user instanceof Response) return user;
  const limited = limitAuthenticated(req, "password");
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const current = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const next = typeof body?.newPassword === "string" ? body.newPassword : "";

  const row = await prisma.user.findUnique({ where: { id: user.id } });
  if (!row || !(await verifyPassword(current, row.passwordHash))) return bad("Senha atual incorreta.");
  if (next.length < 8) return bad("A nova senha precisa ter pelo menos 8 caracteres.");
  if (next === current) return bad("A nova senha deve ser diferente da atual.");

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next), mustChangePassword: false },
  });
  // encerra todas as sessões (inclusive esta) e abre uma nova para quem trocou
  await deleteUserSessions(user.id);
  const { token, expiresAt } = await createSession(user.id);
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", sessionCookieHeader(token, expiresAt));
  return res;
}
