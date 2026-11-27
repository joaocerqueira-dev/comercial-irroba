import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { TEST_USERS, withSession } from "./fixtures";

const db = vi.hoisted(() => ({
  storePreview: {
    findUnique: vi.fn(),
    update: vi.fn(async () => ({ id: "abc" })),
  },
}));
vi.mock("@/lib/db", () => ({ prisma: db }));
const sess = vi.hoisted(() => ({ getUserFromToken: vi.fn() }));
vi.mock("@/lib/auth/session", async (orig) => ({ ...(await orig<object>()), ...sess }));

import { GET, PUT, DELETE } from "@/app/api/previews/[id]/share/route";
import { saveBlueprint } from "@/lib/previews/repository";
import { verifyPassword } from "@/lib/auth/password";
import { resetRateLimits } from "@/lib/net/rate-limit";

const DAY = 86_400_000;
const ctx = { params: Promise.resolve({ id: "abc" }) };
const req = (method: string, body?: unknown) =>
  new NextRequest(
    "http://localhost/api/previews/abc/share",
    withSession({ method, body: body === undefined ? undefined : JSON.stringify(body) })
  );
const row = (ownerId: string, extra = {}) => ({ id: "abc", slug: "loja", ownerId, ...extra });

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();
  sess.getUserFromToken.mockResolvedValue(TEST_USERS.comercial);
  db.storePreview.findUnique.mockResolvedValue(row(TEST_USERS.comercial.id));
});

describe("share: acesso", () => {
  const calls: [string, () => Promise<Response>][] = [
    ["GET", () => GET(req("GET"), ctx)],
    ["PUT", () => PUT(req("PUT", { days: 7 }), ctx)],
    ["DELETE", () => DELETE(req("DELETE"), ctx)],
  ];
  it.each(calls)("%s: 404 para proposta de outro usuário", async (_n, call) => {
    db.storePreview.findUnique.mockResolvedValue(row(TEST_USERS.outro.id));
    expect((await call()).status).toBe(404);
    expect(db.storePreview.update).not.toHaveBeenCalled();
  });
  it.each(calls)("%s: 401 sem sessão", async (_n, call) => {
    sess.getUserFromToken.mockResolvedValue(null);
    expect((await call()).status).toBe(401);
  });
});

describe("PUT share", () => {
  it("days 15 sem senha: prazo, senha gerada, hash e legacyPublic false", async () => {
    const t = Date.now();
    const res = await PUT(req("PUT", { days: 15 }), ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("/preview/loja");
    expect(json.password).toHaveLength(8);
    const data = (db.storePreview.update.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data;
    const exp = (data.shareExpiresAt as Date).getTime();
    expect(Math.abs(exp - (t + 15 * DAY))).toBeLessThan(5000);
    expect(new Date(json.expiresAt).getTime()).toBe(exp);
    expect(await verifyPassword(json.password, data.sharePasswordHash as string)).toBe(true);
    expect(data.legacyPublic).toBe(false);
  });

  it("usa a senha enviada", async () => {
    const json = await (await PUT(req("PUT", { days: 7, password: "minhasenha" }), ctx)).json();
    expect(json.password).toBe("minhasenha");
  });

  it("renovar prazo com senha existente mantém o hash e devolve password null", async () => {
    db.storePreview.findUnique.mockResolvedValue(row(TEST_USERS.comercial.id, { sharePasswordHash: "hash-antigo" }));
    const json = await (await PUT(req("PUT", { days: 7 }), ctx)).json();
    expect(json.password).toBeNull();
    const data = (db.storePreview.update.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data;
    expect(data.sharePasswordHash).toBeUndefined();
  });

  it("regenerate: true gera nova senha mesmo com hash existente", async () => {
    db.storePreview.findUnique.mockResolvedValue(row(TEST_USERS.comercial.id, { sharePasswordHash: "hash-antigo" }));
    const json = await (await PUT(req("PUT", { days: 7, regenerate: true }), ctx)).json();
    expect(json.password).toHaveLength(8);
    const data = (db.storePreview.update.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data;
    expect(await verifyPassword(json.password, data.sharePasswordHash as string)).toBe(true);
  });

  it("data simples vira fim do dia em São Paulo", async () => {
    const d = new Date(Date.now() + 10 * DAY).toISOString().slice(0, 10);
    const res = await PUT(req("PUT", { expiresAt: d }), ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.expiresAt).toBe(new Date(`${d}T23:59:59-03:00`).toISOString());
  });

  it.each([
    ["ontem", { expiresAt: new Date(Date.now() - DAY).toISOString() }],
    ["181 dias", { expiresAt: new Date(Date.now() + 181 * DAY).toISOString() }],
    ["days e expiresAt", { days: 7, expiresAt: new Date(Date.now() + DAY).toISOString() }],
    ["days 10", { days: 10 }],
    ["nenhum", {}],
    ["senha curta", { days: 7, password: "abc" }],
  ])("400: %s", async (_n, body) => {
    expect((await PUT(req("PUT", body), ctx)).status).toBe(400);
    expect(db.storePreview.update).not.toHaveBeenCalled();
  });

  it("proposta legada pública passa a legacyPublic false", async () => {
    db.storePreview.findUnique.mockResolvedValue(row(TEST_USERS.comercial.id, { legacyPublic: true }));
    await PUT(req("PUT", { days: 30 }), ctx);
    const arg = db.storePreview.update.mock.calls[0] as unknown as [{ data: { legacyPublic: boolean } }];
    expect(arg[0].data.legacyPublic).toBe(false);
  });
});

describe("DELETE share", () => {
  it("zera prazo e senha", async () => {
    const res = await DELETE(req("DELETE"), ctx);
    expect(res.status).toBe(200);
    expect(db.storePreview.update).toHaveBeenCalledWith({
      where: { id: "abc" },
      data: { shareExpiresAt: null, sharePasswordHash: null, legacyPublic: false },
    });
  });
});

describe("GET share", () => {
  it("devolve estado sem o hash", async () => {
    db.storePreview.findUnique.mockResolvedValue(
      row(TEST_USERS.comercial.id, {
        shareExpiresAt: new Date(), sharePasswordHash: "h", legacyPublic: false,
        shareStatus: "pendente", contentVersion: 2, responses: [],
      })
    );
    const json = await (await GET(req("GET"), ctx)).json();
    expect(json.hasPassword).toBe(true);
    expect(json.contentVersion).toBe(2);
    expect(JSON.stringify(json)).not.toContain("sharePasswordHash");
    const arg = db.storePreview.findUnique.mock.calls[0] as unknown as [{ include?: unknown; select?: unknown }];
    expect(JSON.stringify(arg[0])).toContain("desc");
  });
});

describe("saveBlueprint", () => {
  it("incrementa contentVersion e volta para pendente", async () => {
    await saveBlueprint("abc", { brand: { name: "X" } } as never);
    const arg = db.storePreview.update.mock.calls[0] as unknown as [{ data: Record<string, unknown> }];
    expect(arg[0].data.contentVersion).toEqual({ increment: 1 });
    expect(arg[0].data.shareStatus).toBe("pendente");
  });
});
