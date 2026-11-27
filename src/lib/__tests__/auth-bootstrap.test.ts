import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  user: { findFirst: vi.fn(), count: vi.fn(), create: vi.fn() },
  storePreview: { updateMany: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ prisma: db }));

import { ensureBootstrapAdmin } from "@/lib/auth/bootstrap";

beforeEach(() => {
  vi.resetAllMocks();
  db.storePreview.updateMany.mockResolvedValue({ count: 2 });
});

describe("ensureBootstrapAdmin", () => {
  it("sem usuários, cria o admin e atribui propostas sem dono", async () => {
    db.user.findFirst.mockResolvedValue(null);
    db.user.count.mockResolvedValue(0);
    db.user.create.mockResolvedValue({ id: "a1" });
    const r = await ensureBootstrapAdmin({ ADMIN_EMAIL: "  Admin@Loja.COM ", ADMIN_PASS: "segredo123" });
    expect(r).toEqual({ created: true, assigned: 2 });
    const data = db.user.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ email: "admin@loja.com", role: "admin", mustChangePassword: true });
    expect(data.passwordHash).toBeTruthy();
    expect(db.storePreview.updateMany).toHaveBeenCalledWith({ where: { ownerId: null }, data: { ownerId: "a1" } });
  });

  it("com admin existente, não cria e atribui ao mais antigo", async () => {
    db.user.findFirst.mockResolvedValue({ id: "old" });
    const r = await ensureBootstrapAdmin({});
    expect(r).toEqual({ created: false, assigned: 2 });
    expect(db.user.create).not.toHaveBeenCalled();
    expect(db.user.findFirst).toHaveBeenCalledWith({ where: { role: "admin" }, orderBy: { createdAt: "asc" } });
    expect(db.storePreview.updateMany).toHaveBeenCalledWith({ where: { ownerId: null }, data: { ownerId: "old" } });
  });

  it("sem usuários e sem variáveis, loga erro e não faz nada", async () => {
    db.user.findFirst.mockResolvedValue(null);
    db.user.count.mockResolvedValue(0);
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await ensureBootstrapAdmin({});
    expect(r).toEqual({ created: false, assigned: 0 });
    expect(err).toHaveBeenCalledWith(expect.stringContaining("Defina ADMIN_EMAIL e ADMIN_PASS"));
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it("há usuários mas nenhum admin: não faz nada", async () => {
    db.user.findFirst.mockResolvedValue(null);
    db.user.count.mockResolvedValue(3);
    const r = await ensureBootstrapAdmin({ ADMIN_EMAIL: "a@b.com", ADMIN_PASS: "x" });
    expect(r).toEqual({ created: false, assigned: 0 });
    expect(db.user.create).not.toHaveBeenCalled();
  });
});
