import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn(async () => ({})) },
}));
vi.mock("@/lib/db", () => ({ prisma: db }));

const sess = vi.hoisted(() => ({
  createSession: vi.fn(async () => ({ token: "tok123", expiresAt: new Date(Date.now() + 1e6) })),
  deleteSession: vi.fn(async () => {}),
  deleteUserSessions: vi.fn(async () => {}),
  getUserFromToken: vi.fn(),
}));
vi.mock("@/lib/auth/session", async (orig) => ({ ...(await orig<object>()), ...sess }));

import { hashPassword } from "@/lib/auth/password";
import { POST as LOGIN } from "@/app/api/auth/login/route";
import { POST as LOGOUT } from "@/app/api/auth/logout/route";
import { GET as ME } from "@/app/api/auth/me/route";
import { POST as PASSWORD } from "@/app/api/auth/password/route";
import { middleware } from "@/middleware";
import { TEST_USERS, withSession } from "./fixtures";

const json = (body: unknown, init: RequestInit = {}) => {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  return new Request("http://localhost/api/x", { ...init, method: "POST", headers, body: JSON.stringify(body) });
};

let dbUser: Record<string, unknown>;
beforeEach(async () => {
  vi.clearAllMocks();
  dbUser = {
    id: "u1", email: "ana@irroba.com", name: "Ana", role: "comercial", active: true,
    mustChangePassword: true, passwordHash: await hashPassword("correta123"),
  };
  db.user.findUnique.mockImplementation(async ({ where }: { where: { email?: string; id?: string } }) =>
    where.email === "ana@irroba.com" || where.id === "u1" ? dbUser : null);
});

describe("login", () => {
  it("normaliza o e-mail, grava lastLoginAt e seta o cookie", async () => {
    const res = await LOGIN(json({ email: " Ana@Irroba.com ", password: "correta123" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: { name: "Ana", role: "comercial", mustChangePassword: true } });
    expect(res.headers.get("set-cookie")).toContain("session=tok123");
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "u1" }, data: { lastLoginAt: expect.any(Date) } }),
    );
  });
  it("usuário inativo e senha errada dão a mesma resposta", async () => {
    const wrong = await LOGIN(json({ email: "ana@irroba.com", password: "errada" }));
    dbUser.active = false;
    const inactive = await LOGIN(json({ email: "ana@irroba.com", password: "correta123" }));
    const unknown = await LOGIN(json({ email: "x@y.com", password: "correta123" }));
    expect(wrong.status).toBe(401);
    for (const r of [inactive, unknown]) {
      expect(r.status).toBe(401);
      expect(await r.text()).toBe(await wrong.clone().text());
    }
    expect(wrong.headers.get("set-cookie")).toBeNull();
  });
  it("11ª tentativa no minuto devolve 429", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      statuses.push((await LOGIN(json({ email: "rate@irroba.com", password: "x" }))).status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});

describe("logout e me", () => {
  it("logout apaga a sessão e limpa o cookie", async () => {
    const res = await LOGOUT(json({}, withSession()));
    expect(res.status).toBe(200);
    expect(sess.deleteSession).toHaveBeenCalledWith("test");
    expect(res.headers.get("set-cookie")).toContain("Max-Age=0");
  });
  it("me devolve o usuário, mesmo com troca de senha pendente", async () => {
    sess.getUserFromToken.mockResolvedValue({ ...TEST_USERS.comercial, mustChangePassword: true });
    const res = await ME(new Request("http://localhost/api/auth/me", withSession()));
    expect(res.status).toBe(200);
    expect((await res.json()).user.id).toBe("u-comercial");
  });
});

describe("troca de senha", () => {
  beforeEach(() => sess.getUserFromToken.mockResolvedValue({ ...TEST_USERS.comercial, id: "u1", mustChangePassword: true }));
  const call = (body: unknown) => PASSWORD(json(body, withSession()));
  it("senha atual errada → 400", async () => {
    expect((await call({ currentPassword: "errada", newPassword: "novasenha1" })).status).toBe(400);
  });
  it("nova com 7 caracteres ou igual à atual → 400", async () => {
    expect((await call({ currentPassword: "correta123", newPassword: "1234567" })).status).toBe(400);
    expect((await call({ currentPassword: "correta123", newPassword: "correta123" })).status).toBe(400);
    expect(db.user.update).not.toHaveBeenCalled();
  });
  it("OK grava mustChangePassword false, apaga sessões e emite novo cookie", async () => {
    const res = await call({ currentPassword: "correta123", newPassword: "novasenha1" });
    expect(res.status).toBe(200);
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "u1" }, data: expect.objectContaining({ mustChangePassword: false, passwordHash: expect.any(String) }) }),
    );
    expect(sess.deleteUserSessions).toHaveBeenCalledWith("u1");
    expect(res.headers.get("set-cookie")).toContain("session=tok123");
  });
  it("sem sessão → 401", async () => {
    sess.getUserFromToken.mockResolvedValue(null);
    expect((await call({ currentPassword: "a", newPassword: "bbbbbbbb" })).status).toBe(401);
  });
});

describe("middleware", () => {
  const mw = (path: string, cookie?: string) =>
    middleware(new NextRequest(`http://localhost${path}`, cookie ? { headers: { cookie } } : {}));
  it("API sem cookie → 401 JSON", async () => {
    const res = mw("/api/previews");
    expect(res.status).toBe(401);
    expect(await res.json()).toHaveProperty("error");
  });
  it("página sem cookie → 307 para /login?next=", () => {
    const res = mw("/studio/x");
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname + new URL(res.headers.get("location")!).search).toBe("/login?next=%2Fstudio%2Fx");
  });
  it("públicos e com cookie passam", () => {
    expect(mw("/preview/x").headers.get("x-middleware-next")).toBe("1");
    expect(mw("/api/auth/login").headers.get("x-middleware-next")).toBe("1");
    expect(mw("/studio/x", "session=abc").headers.get("x-middleware-next")).toBe("1");
    expect(mw("/admin/users").status).toBe(307);
    expect(mw("/conta/senha", "session=abc").headers.get("x-middleware-next")).toBe("1");
  });
});
