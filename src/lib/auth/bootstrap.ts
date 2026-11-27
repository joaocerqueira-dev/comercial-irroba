import { prisma } from "@/lib/db";
import { hashPassword, normalizeEmail } from "./password";

/**
 * Garante um admin (via ADMIN_EMAIL/ADMIN_PASS, só quando não há nenhum usuário) e
 * entrega ao admin mais antigo as propostas sem dono. Idempotente.
 */
export async function ensureBootstrapAdmin(
  env: Record<string, string | undefined> = process.env,
): Promise<{ created: boolean; assigned: number }> {
  let admin = await prisma.user.findFirst({ where: { role: "admin" }, orderBy: { createdAt: "asc" } });
  let created = false;
  if (!admin) {
    if ((await prisma.user.count()) > 0) return { created: false, assigned: 0 };
    const { ADMIN_EMAIL: email, ADMIN_PASS: pass } = env;
    if (!email || !pass) {
      console.error("[boot] Sem usuários cadastrados. Defina ADMIN_EMAIL e ADMIN_PASS para criar o primeiro admin.");
      return { created: false, assigned: 0 };
    }
    admin = await prisma.user.create({
      data: {
        email: normalizeEmail(email),
        name: "Admin",
        passwordHash: await hashPassword(pass),
        role: "admin",
        mustChangePassword: true,
      },
    });
    created = true;
  }
  const { count } = await prisma.storePreview.updateMany({
    where: { ownerId: null },
    data: { ownerId: admin.id },
  });
  return { created, assigned: count };
}
