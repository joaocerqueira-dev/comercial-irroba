import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeEmail, verifyPassword } from "@/lib/auth/password";
import { createSession, sessionCookieHeader } from "@/lib/auth/session";
import { createRateLimiter, getClientIp, tooManyRequests } from "@/lib/net/rate-limit";

const limiter = createRateLimiter();
const INVALID = () => NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 401 });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const rl = limiter.take(`${getClientIp(req)}:${email}`, 10);
  if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

  const user = email && password ? await prisma.user.findUnique({ where: { email } }) : null;
  // ponytail: sem hash fantasma, o tempo de resposta distingue e-mail inexistente; adicionar se isso importar
  if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) return INVALID();

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const { token, expiresAt } = await createSession(user.id);
  const res = NextResponse.json({
    user: { name: user.name, role: user.role, mustChangePassword: user.mustChangePassword },
  });
  res.headers.set("Set-Cookie", sessionCookieHeader(token, expiresAt));
  return res;
}
