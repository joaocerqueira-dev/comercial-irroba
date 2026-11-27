import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { TEST_USERS, withSession } from "./fixtures";

const db = vi.hoisted(() => {
  const tx = {
    storePreview: { updateMany: vi.fn() },
    clientResponse: { create: vi.fn() },
  };
  return {
    tx,
    storePreview: { findUnique: vi.fn() },
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
});
vi.mock("@/lib/db", () => ({ prisma: db }));
const sess = vi.hoisted(() => ({ getUserFromToken: vi.fn() }));
vi.mock("@/lib/auth/session", async (orig) => ({ ...(await orig<object>()), ...sess }));

import { POST } from "@/app/api/share/[slug]/respond/route";
import { hashPassword } from "@/lib/auth/password";
import { signShareCookie } from "@/lib/share/access";
import { buildWhatsappLink, formatResponseStatus, STATUS_BY_RESPONSE } from "@/lib/share/responses";

describe("buildWhatsappLink", () => {
  const url = (t: string) => `https://wa.me/5511999999999?text=${encodeURIComponent(t)}`;
  it("monta as três mensagens", () => {
    expect(buildWhatsappLink("+55 (11) 99999-9999", "aprovar", "Loja X")).toBe(url("Aprovei a proposta da loja Loja X"));
    expect(buildWhatsappLink("+55 (11) 99999-9999", "ajustes", "Loja X", "trocar cor")).toBe(
      url("Pedi ajustes na proposta da loja Loja X: trocar cor")
    );
    expect(buildWhatsappLink("+55 (11) 99999-9999", "recusar", "Loja X")).toBe(url("Recusei a proposta da loja Loja X"));
  });
  it("sem WhatsApp devolve null", () => {
    expect(buildWhatsappLink(null, "aprovar", "X")).toBeNull();
    expect(buildWhatsappLink("", "aprovar", "X")).toBeNull();
  });
});

describe("formatResponseStatus", () => {
  it("formata no fuso de São Paulo", () => {
    const createdAt = new Date("2026-11-27T17:05:00Z");
    expect(formatResponseStatus({ type: "aprovar", clientName: "Ana", createdAt })).toBe("Aprovada por Ana em 27/11 às 14h05");
    expect(formatResponseStatus({ type: "ajustes", clientName: "Ana", createdAt })).toBe("Ajustes pedidos por Ana em 27/11 às 14h05");
    expect(formatResponseStatus({ type: "recusar", clientName: "Ana", createdAt })).toBe("Recusada por Ana em 27/11 às 14h05");
    expect(STATUS_BY_RESPONSE.ajustes).toBe("ajustes");
  });
});

describe("POST /api/share/[slug]/respond", () => {
  const DAY = 86_400_000;
  const future = new Date(Date.now() + 7 * DAY);
  const past = new Date(Date.now() - DAY);
  let H = "";
  let cookie = "";
  const row = (extra = {}) => ({
    id: "p1",
    slug: "loja-a",
    ownerId: TEST_USERS.comercial.id,
    legacyPublic: false,
    shareExpiresAt: future,
    sharePasswordHash: H,
    shareStatus: "pendente",
    contentVersion: 3,
    ...extra,
  });
  beforeAll(async () => {
    H = await hashPassword("segredo1");
    cookie = `share_loja-a=${signShareCookie("loja-a", H, future)}`;
  });
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("TRUST_PROXY", "1");
    sess.getUserFromToken.mockResolvedValue(null);
    db.storePreview.findUnique.mockImplementation(async () => row());
    db.$transaction.mockImplementation(async (fn: (t: typeof db.tx) => unknown) => fn(db.tx));
    db.tx.storePreview.updateMany.mockResolvedValue({ count: 1 });
    db.tx.clientResponse.create.mockImplementation(async ({ data }: { data: object }) => ({ id: "r1", ...data }));
  });
  afterEach(() => vi.unstubAllEnvs());

  let ipSeq = 0;
  const respond = (body: object, headers: Record<string, string> = { cookie }) =>
    POST(
      new NextRequest("http://localhost/api/share/loja-a/respond", {
        method: "POST",
        body: JSON.stringify({ contentVersion: 3, ...body }),
        headers: { "x-forwarded-for": `10.1.0.${++ipSeq}`, ...headers },
      }),
      { params: Promise.resolve({ slug: "loja-a" }) }
    );

  it("cookie granted grava resposta com a contentVersion atual e muda o status", async () => {
    const res = await respond({ type: "aprovar", clientName: "Ana" });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.shareStatus).toBe("aprovada");
    expect(db.tx.storePreview.updateMany).toHaveBeenCalledWith({
      where: { id: "p1", shareStatus: "pendente", contentVersion: 3 },
      data: { shareStatus: "aprovada" },
    });
    expect(db.tx.clientResponse.create.mock.calls[0][0].data).toMatchObject({
      previewId: "p1",
      type: "aprovar",
      clientName: "Ana",
      contentVersion: 3,
    });
  });

  it("só granted responde", async () => {
    for (const [r, h] of [
      [row({ legacyPublic: true }), {}],
      [row(), {}],
    ] as const) {
      db.storePreview.findUnique.mockImplementation(async () => r);
      expect((await respond({ type: "aprovar", clientName: "Ana" }, { ...h })).status).toBe(403);
    }
    db.storePreview.findUnique.mockImplementation(async () => row({ shareExpiresAt: past }));
    expect((await respond({ type: "aprovar", clientName: "Ana" })).status).toBe(410);
    db.storePreview.findUnique.mockImplementation(async () => row());
    // dono logado sem cookie
    sess.getUserFromToken.mockResolvedValue(TEST_USERS.comercial);
    const init = withSession();
    const res = await respond({ type: "aprovar", clientName: "Ana" }, init.headers as Record<string, string>);
    expect(res.status).toBe(403);
    expect(db.tx.clientResponse.create).not.toHaveBeenCalled();
  });

  it("slug desconhecido 404", async () => {
    db.storePreview.findUnique.mockResolvedValue(null);
    expect((await respond({ type: "aprovar", clientName: "Ana" })).status).toBe(404);
  });

  it("validação: ajustes sem mensagem, tipo e nome inválidos", async () => {
    expect((await respond({ type: "ajustes", clientName: "Ana" })).status).toBe(400);
    expect((await respond({ type: "ajustes", clientName: "Ana", message: "ab" })).status).toBe(400);
    expect((await respond({ type: "xxx", clientName: "Ana" })).status).toBe(400);
    expect((await respond({ type: "aprovar", clientName: "" })).status).toBe(400);
    expect((await respond({ type: "aprovar", clientName: "a".repeat(81) })).status).toBe(400);
    expect((await respond({ type: "recusar", clientName: "Ana", message: "a".repeat(2001) })).status).toBe(400);
  });

  it("status já respondido: 409", async () => {
    db.storePreview.findUnique.mockImplementation(async () => row({ shareStatus: "aprovada" }));
    const res = await respond({ type: "recusar", clientName: "Ana" });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Esta proposta já foi respondida.");
  });

  it("concorrência: updateMany count 0 gera 409 sem criar resposta", async () => {
    db.tx.storePreview.updateMany.mockResolvedValue({ count: 0 });
    const res = await respond({ type: "aprovar", clientName: "Ana" });
    expect(res.status).toBe(409);
    expect(db.tx.clientResponse.create).not.toHaveBeenCalled();
  });

  it("contentVersion desatualizada: 409 sem criar resposta", async () => {
    const res = await respond({ type: "aprovar", clientName: "Ana", contentVersion: 2 });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("A proposta foi atualizada. Recarregue a página para ver a versão nova.");
    expect(db.tx.clientResponse.create).not.toHaveBeenCalled();
  });

  it("contentVersion ausente: 400", async () => {
    const res = await respond({ type: "aprovar", clientName: "Ana", contentVersion: undefined });
    expect(res.status).toBe(400);
  });

  it("tipo herdado (toString): 400", async () => {
    expect((await respond({ type: "toString", clientName: "Ana" })).status).toBe(400);
  });
});
