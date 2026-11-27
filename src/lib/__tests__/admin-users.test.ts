import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { TEST_USERS, withSession } from "./fixtures";
import { verifyPassword } from "@/lib/auth/password";

const db = vi.hoisted(() => ({
  user: {
    findMany: vi.fn(async () => [] as unknown[]),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(async () => ({})),
    count: vi.fn(async () => 0),
  },
}));
vi.mock("@/lib/db", () => ({ prisma: db }));
const sess = vi.hoisted(() => ({ getUserFromToken: vi.fn(), deleteUserSessions: vi.fn(async () => undefined) }));
vi.mock("@/lib/auth/session", async (orig) => ({ ...(await orig<object>()), ...sess }));

import { GET, POST } from "@/app/api/admin/users/route";
import { PATCH } from "@/app/api/admin/users/[id]/route";
import { POST as RESET } from "@/app/api/admin/users/[id]/reset-password/route";
import { resetRateLimits } from "@/lib/net/rate-limit";

const ctx = (id = "u1") => ({ params: Promise.resolve({ id }) });
const json = (method: string, body?: unknown) =>
  new NextRequest("http://x/api/admin/users", withSession({ method, body: body === undefined ? undefined : JSON.stringify(body), headers: { "content-type": "application/json" } }));
const target = (over: object = {}) => ({ id: "u1", role: "admin", active: true, ...over });

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();
  sess.getUserFromToken.mockResolvedValue(TEST_USERS.admin);
  db.user.findUnique.mockResolvedValue(target());
  db.user.count.mockResolvedValue(0);
});

describe("admin users: acesso", () => {
  it("comercial recebe 403 nas 4 rotas", async () => {
    sess.getUserFromToken.mockResolvedValue(TEST_USERS.comercial);
    const body = { name: "A", email: "a@b.com", role: "comercial" };
    expect((await GET(json("GET"))).status).toBe(403);
    expect((await POST(json("POST", body))).status).toBe(403);
    expect((await PATCH(json("PATCH", { active: false }), ctx())).status).toBe(403);
    expect((await RESET(json("POST"), ctx())).status).toBe(403);
    expect(db.user.create).not.toHaveBeenCalled();
  });
});

describe("GET", () => {
  it("achata previewCount e não vaza passwordHash", async () => {
    db.user.findMany.mockResolvedValue([
      { id: "u1", name: "A", email: "a@b.com", role: "admin", active: true, lastLoginAt: null, _count: { previews: 3 } },
    ]);
    const body = await (await GET(json("GET"))).json();
    expect(body.users[0].previewCount).toBe(3);
    expect(JSON.stringify(body)).not.toContain("passwordHash");
  });
});

describe("POST", () => {
  it("normaliza e-mail, grava hash da senha temporária e mustChangePassword", async () => {
    db.user.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "n1", ...data }));
    const res = await POST(json("POST", { name: "Ana", email: "  Ana@Irroba.com ", role: "comercial" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    const data = db.user.create.mock.calls[0][0].data;
    expect(data.email).toBe("ana@irroba.com");
    expect(data.mustChangePassword).toBe(true);
    expect(await verifyPassword(body.tempPassword, data.passwordHash)).toBe(true);
    expect(JSON.stringify(body.user)).not.toContain("passwordHash");
    expect(JSON.stringify(data)).not.toContain(body.tempPassword);
  });

  it("e-mail repetido (P2002) vira 409", async () => {
    db.user.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "x" }));
    const res = await POST(json("POST", { name: "Ana", email: "a@b.com", role: "comercial" }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("E-mail já cadastrado.");
  });

  it("role inválido -> 400", async () => {
    const res = await POST(json("POST", { name: "Ana", email: "a@b.com", role: "root" }));
    expect(res.status).toBe(400);
  });
});

describe("PATCH", () => {
  it("admin não inativa a si mesmo, mesmo com outro admin -> 409", async () => {
    db.user.findUnique.mockResolvedValue(target({ id: TEST_USERS.admin.id }));
    db.user.count.mockResolvedValue(1);
    const res = await PATCH(json("PATCH", { active: false }), ctx(TEST_USERS.admin.id));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Você não pode inativar a si mesmo.");
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("inativar o último admin ativo -> 409", async () => {
    const res = await PATCH(json("PATCH", { active: false }), ctx());
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("É preciso manter pelo menos um admin ativo.");
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("rebaixar o último admin -> 409", async () => {
    expect((await PATCH(json("PATCH", { role: "comercial" }), ctx())).status).toBe(409);
  });

  it("com outro admin ativo -> 200 e encerra sessões ao inativar", async () => {
    db.user.count.mockResolvedValue(1);
    const res = await PATCH(json("PATCH", { active: false }), ctx());
    expect(res.status).toBe(200);
    expect(sess.deleteUserSessions).toHaveBeenCalledWith("u1");
  });

  it("inativar comercial não exige outro admin", async () => {
    db.user.findUnique.mockResolvedValue(target({ role: "comercial" }));
    expect((await PATCH(json("PATCH", { active: false }), ctx())).status).toBe(200);
  });

  it("role fora do enum -> 400; corpo vazio -> 400", async () => {
    expect((await PATCH(json("PATCH", { role: "root" }), ctx())).status).toBe(400);
    expect((await PATCH(json("PATCH", {}), ctx())).status).toBe(400);
  });
});

describe("reset-password", () => {
  it("grava mustChangePassword, encerra sessões e devolve a senha", async () => {
    const res = await RESET(json("POST"), ctx());
    expect(res.status).toBe(200);
    const { tempPassword } = await res.json();
    const data = (db.user.update.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data;
    expect(data.mustChangePassword).toBe(true);
    expect(await verifyPassword(tempPassword, data.passwordHash as string)).toBe(true);
    expect(sess.deleteUserSessions).toHaveBeenCalledWith("u1");
  });

  it("erro que não é P2025 propaga (não vira 404)", async () => {
    db.user.update.mockRejectedValueOnce(new Error("db down"));
    await expect(RESET(json("POST"), ctx())).rejects.toThrow("db down");
  });

  it("P2025 -> 404", async () => {
    db.user.update.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("nf", { code: "P2025", clientVersion: "x" }));
    expect((await RESET(json("POST"), ctx())).status).toBe(404);
  });
});
