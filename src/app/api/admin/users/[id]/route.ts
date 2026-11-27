import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { limitAuthenticated } from "@/lib/net/rate-limit";
import { deleteUserSessions } from "@/lib/auth/session";

const Body = z
  .object({
    active: z.boolean(),
    role: z.enum(["comercial", "admin"]),
    name: z.string().trim().min(1).max(80),
  })
  .partial()
  .refine((b) => Object.keys(b).length > 0);

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;
  const limited = limitAuthenticated(req, "admin");
  if (limited) return limited;
  const { id } = await context.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const data = parsed.data;

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, active: true } });
  if (!target) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  if (id === admin.id && data.active === false) {
    return NextResponse.json({ error: "Você não pode inativar a si mesmo." }, { status: 409 });
  }

  const losesAdmin = target.role === "admin" && target.active && (data.active === false || data.role === "comercial");
  if (losesAdmin) {
    const others = await prisma.user.count({ where: { role: "admin", active: true, id: { not: id } } });
    if (others === 0) {
      return NextResponse.json({ error: "É preciso manter pelo menos um admin ativo." }, { status: 409 });
    }
  }

  await prisma.user.update({ where: { id }, data });
  if (data.active === false) await deleteUserSessions(id);
  return NextResponse.json({ ok: true });
}
