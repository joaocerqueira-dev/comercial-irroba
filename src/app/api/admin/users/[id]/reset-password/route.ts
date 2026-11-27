import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }
    throw e;
  }
  await deleteUserSessions(id);
  return NextResponse.json({ tempPassword });
}
