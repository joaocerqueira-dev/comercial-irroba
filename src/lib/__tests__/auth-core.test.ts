import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  session: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn(async () => ({})), deleteMany: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ prisma: db }));

import { generateTempPassword, hashPassword, normalizeEmail, verifyPassword } from "@/lib/auth/password";
import {
  SESSION_TTL_MS,
  clearSessionCookieHeader,
  createSession,
  deleteSession,
  deleteUserSessions,
  getUserFromToken,
  sessionCookieHeader,
} from "@/lib/auth/session";

const user = { id: "u1", email: "a@b.com", name: "Ana", role: "comercial", active: true, mustChangePassword: false };

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllEnvs());

describe("senha", () => {
  it("verifica senha correta, rejeita errada e hash corrompido", async () => {
    const h = await hashPassword("s3nha");
    expect(await verifyPassword("s3nha", h)).toBe(true);
    expect(await verifyPassword("outra", h)).toBe(false);
    expect(await verifyPassword("s3nha", "lixo")).toBe(false);
  });
  it("usa salt", async () => {
    expect(await hashPassword("x")).not.toBe(await hashPassword("x"));
  });
  it("senha temporária sem caracteres ambíguos", () => {
    expect(generateTempPassword()).toMatch(/^[A-HJ-NP-Za-km-z2-9]{12}$/);
  });
  it("normalizeEmail", () => {
    expect(normalizeEmail(" Ana@Irroba.com ")).toBe("ana@irroba.com");
  });
});

describe("sessão", () => {
  it("grava o SHA-256 do token, não o token", async () => {
    const { token } = await createSession("u1");
    const id = db.session.create.mock.calls[0][0].data.id;
    expect(id).toBe(createHash("sha256").update(token).digest("hex"));
    expect(id).not.toBe(token);
  });
  it("sem token não consulta o banco", async () => {
    expect(await getUserFromToken(undefined)).toBeNull();
    expect(db.session.findUnique).not.toHaveBeenCalled();
  });
  it("sessão vencida apaga e devolve null", async () => {
    db.session.findUnique.mockResolvedValue({ id: "x", expiresAt: new Date(Date.now() - 1000), user });
    expect(await getUserFromToken("t")).toBeNull();
    expect(db.session.delete).toHaveBeenCalled();
  });
  it("usuário inativo devolve null", async () => {
    db.session.findUnique.mockResolvedValue({ id: "x", expiresAt: new Date(Date.now() + SESSION_TTL_MS), user: { ...user, active: false } });
    expect(await getUserFromToken("t")).toBeNull();
  });
  it("renova quando mais da metade do TTL passou", async () => {
    db.session.findUnique.mockResolvedValue({ id: "x", expiresAt: new Date(Date.now() + SESSION_TTL_MS / 4), user });
    const u = await getUserFromToken("t");
    expect(u).toEqual({ id: "u1", email: "a@b.com", name: "Ana", role: "comercial", mustChangePassword: false });
    expect(db.session.update).toHaveBeenCalledTimes(1);
    expect(db.session.update.mock.calls[0][0].data.expiresAt.getTime()).toBeGreaterThan(Date.now() + SESSION_TTL_MS - 5000);
  });
  it("não renova sessão recente", async () => {
    db.session.findUnique.mockResolvedValue({ id: "x", expiresAt: new Date(Date.now() + SESSION_TTL_MS - 1000), user });
    await getUserFromToken("t");
    expect(db.session.update).not.toHaveBeenCalled();
  });
  it("deleteSession e deleteUserSessions", async () => {
    await deleteSession("t");
    expect(db.session.delete).toHaveBeenCalled();
    await deleteUserSessions("u1");
    expect(db.session.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } });
  });
});

describe("cookie", () => {
  it("atributos; Secure só em produção", () => {
    const d = new Date();
    vi.stubEnv("NODE_ENV", "development");
    const h = sessionCookieHeader("tok", d);
    for (const a of ["HttpOnly", "SameSite=Lax", "Path=/", "Expires="]) expect(h).toContain(a);
    expect(h).not.toContain("Secure");
    vi.stubEnv("NODE_ENV", "production");
    expect(sessionCookieHeader("tok", d)).toContain("Secure");
    expect(clearSessionCookieHeader()).toContain("Max-Age=0");
  });
});
