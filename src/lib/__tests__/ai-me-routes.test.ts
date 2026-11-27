import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { TEST_USERS, withSession } from "./fixtures";

type Row = { userId: string; purpose: string; provider: string; apiKeyEncrypted: string; baseUrl: string | null; model: string | null; last4: string; updatedAt: Date };
const store = vi.hoisted(() => ({ rows: [] as Row[] }));
const db = vi.hoisted(() => ({
  aiCredential: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
}));
vi.mock("@/lib/db", () => ({ prisma: db }));
const sess = vi.hoisted(() => ({ getUserFromToken: vi.fn() }));
vi.mock("@/lib/auth/session", async (orig) => ({ ...(await orig<object>()), ...sess }));
const ai = vi.hoisted(() => ({ generateText: vi.fn() }));
vi.mock("ai", async (orig) => ({ ...(await orig<object>()), ...ai }));

import { GET, PUT, DELETE } from "@/app/api/me/ai/route";
import { POST as TEST } from "@/app/api/me/ai/test/route";
import { decryptApiKey, encryptApiKey } from "@/lib/ai/secret-box";
import { resetRateLimits } from "@/lib/net/rate-limit";

const KEY = "sk-proj-ABCDEF1234567890";
const req = (method: string, body?: unknown, qs = "") =>
  new NextRequest(
    `http://localhost/api/me/ai${qs}`,
    withSession({ method, body: body === undefined ? undefined : JSON.stringify(body) }),
  );
const seed = (userId: string, purpose: string, provider: string, key = KEY, extra = {}) =>
  store.rows.push({ userId, purpose, provider, apiKeyEncrypted: encryptApiKey(key), baseUrl: null, model: null, last4: key.slice(-4), updatedAt: new Date(), ...extra });

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();
  store.rows = [];
  sess.getUserFromToken.mockResolvedValue(TEST_USERS.comercial);
  const find = (userId: string, purpose: string) => store.rows.find((r) => r.userId === userId && r.purpose === purpose) ?? null;
  db.aiCredential.findUnique.mockImplementation(async ({ where }) => find(where.userId_purpose.userId, where.userId_purpose.purpose));
  db.aiCredential.upsert.mockImplementation(async ({ where, create, update }) => {
    const cur = find(where.userId_purpose.userId, where.userId_purpose.purpose);
    if (cur) return Object.assign(cur, update, { updatedAt: new Date() });
    const row = { baseUrl: null, model: null, ...create, updatedAt: new Date() };
    store.rows.push(row);
    return row;
  });
  db.aiCredential.deleteMany.mockImplementation(async ({ where }) => {
    store.rows = store.rows.filter((r) => !(r.userId === where.userId && r.purpose === where.purpose));
    return { count: 1 };
  });
});

describe("/api/me/ai", () => {
  it("401 sem sessão", async () => {
    sess.getUserFromToken.mockResolvedValue(null);
    expect((await GET(req("GET"))).status).toBe(401);
  });

  it("PUT cria; GET devolve last4 e nenhuma chave", async () => {
    const put = await PUT(req("PUT", { purpose: "texto", provider: "openai", apiKey: KEY }));
    expect(put.status).toBe(200);
    expect(JSON.stringify(await put.json())).not.toContain(KEY);
    const body = await (await GET(req("GET"))).json();
    expect(body.texto.last4).toBe("7890");
    expect(body.imagem).toBeNull();
    expect(JSON.stringify(body)).not.toContain(KEY);
    expect(JSON.stringify(body)).not.toContain("apiKeyEncrypted");
    expect(decryptApiKey(store.rows[0].apiKeyEncrypted)).toBe(KEY);
  });

  it("PUT sem apiKey mantém a chave; sem apiKey na criação → 400", async () => {
    expect((await PUT(req("PUT", { purpose: "texto", provider: "openai" }))).status).toBe(400);
    seed(TEST_USERS.comercial.id, "texto", "openai");
    const res = await PUT(req("PUT", { purpose: "texto", provider: "openai", model: "gpt-x" }));
    expect(res.status).toBe(200);
    expect(decryptApiKey(store.rows[0].apiKeyEncrypted)).toBe(KEY);
    expect(store.rows[0].model).toBe("gpt-x");
  });

  it("usuário B não vê a credencial de A", async () => {
    seed(TEST_USERS.outro.id, "texto", "openai");
    const body = await (await GET(req("GET"))).json();
    expect(body.texto).toBeNull();
  });

  it("credencial indecifrável volta com broken", async () => {
    seed(TEST_USERS.comercial.id, "texto", "openai", KEY, { apiKeyEncrypted: "lixo" });
    const body = await (await GET(req("GET"))).json();
    expect(body.texto).toMatchObject({ broken: true, last4: "7890" });
  });

  it("imagem + anthropic → 400", async () => {
    expect((await PUT(req("PUT", { purpose: "imagem", provider: "anthropic", apiKey: KEY }))).status).toBe(400);
  });

  it("reuseText: anthropic → 400; google → copia", async () => {
    const body = { purpose: "imagem", provider: "google", reuseText: true };
    seed(TEST_USERS.comercial.id, "texto", "anthropic");
    expect((await PUT(req("PUT", body))).status).toBe(400);
    store.rows = [];
    seed(TEST_USERS.comercial.id, "texto", "google", "AIzaSyGOOGLEKEY9999");
    const res = await PUT(req("PUT", body));
    expect(res.status).toBe(200);
    const img = store.rows.find((r) => r.purpose === "imagem")!;
    expect(img.provider).toBe("google");
    expect(decryptApiKey(img.apiKeyEncrypted)).toBe("AIzaSyGOOGLEKEY9999");
  });

  it("openai-compatible: baseUrl interna ou sem model → 400", async () => {
    const b = { purpose: "texto", provider: "openai-compatible", apiKey: KEY };
    expect((await PUT(req("PUT", { ...b, baseUrl: "https://127.0.0.1/v1", model: "m" }))).status).toBe(400);
    expect((await PUT(req("PUT", { ...b, baseUrl: "http://example.com/v1", model: "m" }))).status).toBe(400);
    expect((await PUT(req("PUT", { ...b, baseUrl: "https://127.0.0.1/v1" }))).status).toBe(400);
  });

  it("DELETE remove", async () => {
    seed(TEST_USERS.comercial.id, "texto", "openai");
    expect((await DELETE(req("DELETE", undefined, "?purpose=texto"))).status).toBe(204);
    expect(store.rows).toHaveLength(0);
  });
});

describe("/api/me/ai/test", () => {
  const post = (body: unknown) =>
    TEST(new NextRequest("http://localhost/api/me/ai/test", withSession({ method: "POST", body: JSON.stringify(body) })));

  it("erro do provedor vira mensagem fixa", async () => {
    seed(TEST_USERS.comercial.id, "texto", "openai");
    ai.generateText.mockRejectedValue({ statusCode: 401, message: `bad key ${KEY}` });
    const body = await (await post({ purpose: "texto" })).json();
    expect(body).toEqual({ ok: false, error: "Chave da sua IA inválida ou sem permissão. Confira em Minha IA." });
  });

  it("sucesso devolve o modelo", async () => {
    seed(TEST_USERS.comercial.id, "texto", "openai");
    ai.generateText.mockResolvedValue({ text: "OK" });
    expect(await (await post({ purpose: "texto" })).json()).toEqual({ ok: true, model: "gpt-5.4-mini" });
  });

  it("imagem usa o modelo de texto padrão do provedor", async () => {
    seed(TEST_USERS.comercial.id, "imagem", "google");
    ai.generateText.mockResolvedValue({ text: "OK" });
    expect(await (await post({ purpose: "imagem" })).json()).toEqual({ ok: true, model: "gemini-3.5-flash" });
  });
});
