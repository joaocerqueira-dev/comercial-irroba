import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

export type Role = "comercial" | "admin";
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  mustChangePassword: boolean;
}

export const SESSION_COOKIE = "session";
export const SESSION_TTL_MS = 7 * 24 * 3600 * 1000;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  return { token, expiresAt };
}

export async function getUserFromToken(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null;
  const id = hashToken(token);
  const s = await prisma.session.findUnique({ where: { id }, include: { user: true } });
  if (!s) return null;
  if (s.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id } }).catch(() => {});
    return null;
  }
  if (!s.user.active) return null;
  // renovação deslizante: renova quando resta menos da metade do TTL
  if (s.expiresAt.getTime() - Date.now() < SESSION_TTL_MS / 2) {
    await prisma.session.update({ where: { id }, data: { expiresAt: new Date(Date.now() + SESSION_TTL_MS) } });
  }
  const { email, name, role, mustChangePassword } = s.user;
  return { id: s.user.id, email, name, role: role as Role, mustChangePassword };
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.delete({ where: { id: hashToken(token) } }).catch(() => {});
}

export async function deleteUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

const secure = () => (process.env.NODE_ENV === "production" ? "; Secure" : "");

export function sessionCookieHeader(token: string, expiresAt: Date): string {
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Expires=${expiresAt.toUTCString()}${secure()}`;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0; Expires=${new Date(0).toUTCString()}${secure()}`;
}
