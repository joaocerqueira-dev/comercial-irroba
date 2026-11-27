import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { limitAuthenticated } from "@/lib/net/rate-limit";
import { generateTempPassword, hashPassword, normalizeEmail } from "@/lib/auth/password";

const Body = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  role: z.enum(["comercial", "admin"]),
});

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;
  const limited = limitAuthenticated(req, "admin");
  if (limited) return limited;
  const rows = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true, name: true, email: true, role: true, active: true, lastLoginAt: true,
      _count: { select: { previews: true } },
    },
  });
  const users = rows.map(({ _count, ...u }) => ({ ...u, previewCount: _count.previews }));
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;
  const limited = limitAuthenticated(req, "admin");
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const tempPassword = generateTempPassword();
  try {
    const { passwordHash: _omit, ...user } = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: normalizeEmail(parsed.data.email),
        role: parsed.data.role,
        passwordHash: await hashPassword(tempPassword),
        mustChangePassword: true,
      },
    });
    void _omit;
    return NextResponse.json({ user, tempPassword }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 });
    }
    throw e;
  }
}
