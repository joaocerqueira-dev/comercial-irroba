import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { limitAuthenticated } from "@/lib/net/rate-limit";
import { deleteUserSessions } from "@/lib/auth/session";
import { generateTempPassword, hashPassword } from "@/lib/auth/password";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;
  const limited = limitAuthenticated(req, "admin");
  if (limited) return limited;
  const { id } = await context.params;
  const tempPassword = generateTempPassword();
  try {
    await prisma.user.update({
      where: { id },
      data: { passwordHash: await hashPassword(tempPassword), mustChangePassword: true },
    });
  } catch {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }
  await deleteUserSessions(id);
  return NextResponse.json({ tempPassword });
}
