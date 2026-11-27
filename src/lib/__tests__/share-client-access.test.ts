import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { buildHeuristicBlueprint } from "@/lib/ai/architect";
import { makeSampleExtracted, TEST_USERS } from "./fixtures";

const db = vi.hoisted(() => ({ storePreview: { findUnique: vi.fn() } }));
vi.mock("@/lib/db", () => ({ prisma: db }));
const sess = vi.hoisted(() => ({ getUserFromToken: vi.fn() }));
vi.mock("@/lib/auth/session", async (orig) => ({ ...(await orig<object>()), ...sess }));
const shots = vi.hoisted(() => ({ getCachedMobileScreenshots: vi.fn() }));
vi.mock("@/lib/scraper/mobile-screenshot", () => shots);

import { POST as UNLOCK } from "@/app/api/share/[slug]/unlock/route";
import { GET as RENDER } from "@/app/render/[slug]/route";
import { GET as MOBILE } from "@/app/api/captures/mobile/[slug]/route";
import { isPublicPath } from "@/middleware";
import { hashPassword } from "@/lib/auth/password";
import { signShareCookie } from "@/lib/share/access";

const DAY = 86_400_000;
const future = new Date(Date.now() + 7 * DAY);
const past = new Date(Date.now() - DAY);
let H = "";
let cookie = "";
const blueprint = buildHeuristicBlueprint(makeSampleExtracted());
const row = (extra = {}) => ({
  id: "p1",
  slug: "loja-a",
  ownerId: TEST_USERS.comercial.id,
  legacyPublic: false,
  shareExpiresAt: future,
  sharePasswordHash: H,
  blueprint,
  updatedAt: new Date("2026-11-26T12:00:00Z"),
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
});
afterEach(() => vi.unstubAllEnvs());

let ipSeq = 0;
const unlock = (password: string, ip = `10.0.0.${++ipSeq}`) =>
  UNLOCK(
    new NextRequest("http://localhost/api/share/loja-a/unlock", {
      method: "POST",
      body: JSON.stringify({ password }),
      headers: { "x-forwarded-for": ip },
    }),
    { params: Promise.resolve({ slug: "loja-a" }) }
  );

describe("POST /api/share/[slug]/unlock", () => {
  it("senha certa: 200 com cookie httpOnly do slug", async () => {
    const res = await unlock("segredo1");
    expect(res.status).toBe(200);
    const sc = res.headers.get("set-cookie") ?? "";
    expect(sc).toContain("share_loja-a=");
    expect(sc).toContain("HttpOnly");
    expect(sc).toContain("Path=/");
  });

  it("senha errada: 401 com o texto exato", async () => {
    const res = await unlock("errada");
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Senha incorreta.");
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("expirado: 410", async () => {
    db.storePreview.findUnique.mockResolvedValue(row({ shareExpiresAt: past }));
    const res = await unlock("segredo1");
    expect(res.status).toBe(410);
    expect((await res.json()).error).toBe("Proposta expirada, fale com seu comercial");
  });

  it("inexistente ou indisponível: 404", async () => {
    db.storePreview.findUnique.mockResolvedValueOnce(null);
    expect((await unlock("segredo1")).status).toBe(404);
    db.storePreview.findUnique.mockResolvedValueOnce(row({ sharePasswordHash: null, shareExpiresAt: null }));
    expect((await unlock("segredo1")).status).toBe(404);
  });

  it("6ª tentativa no minuto (IP+slug): 429", async () => {
    for (let i = 0; i < 5; i++) expect((await unlock("errada", "9.9.9.9")).status).toBe(401);
    expect((await unlock("segredo1", "9.9.9.9")).status).toBe(429);
  });

  it("sem SESSION_SECRET em produção: 503", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "");
    const res = await unlock("segredo1");
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("Compartilhamento indisponível: defina SESSION_SECRET.");
  });
});

describe("GET /render/[slug]", () => {
  const render = (headers: Record<string, string> = {}) =>
    RENDER(new NextRequest("http://localhost/render/loja-a", { headers }), {
      params: Promise.resolve({ slug: "loja-a" }),
    });

  it("sem cookie numa proposta com senha: 404", async () => {
    expect((await render()).status).toBe(404);
  });
  it("cookie válido: 200", async () => {
    expect((await render({ cookie })).status).toBe(200);
  });
  it("legacyPublic: 200", async () => {
    db.storePreview.findUnique.mockResolvedValue(row({ legacyPublic: true }));
    expect((await render()).status).toBe(200);
  });
  it("expirado com cookie válido: 404", async () => {
    db.storePreview.findUnique.mockResolvedValue(row({ shareExpiresAt: past }));
    expect((await render({ cookie })).status).toBe(404);
  });
  it("dono logado: 200", async () => {
    sess.getUserFromToken.mockResolvedValue(TEST_USERS.comercial);
    expect((await render({ cookie: "session=t" })).status).toBe(200);
  });
  it("cache e ETag não vazam para quem não tem acesso", async () => {
    const ok = await render({ cookie });
    expect(ok.status).toBe(200);
    expect((await render()).status).toBe(404);
    expect((await render({ "if-none-match": ok.headers.get("etag")! })).status).toBe(404);
  });
});

describe("GET /api/captures/mobile/[slug]", () => {
  const mobile = (headers: Record<string, string> = {}) =>
    MOBILE(new NextRequest("http://localhost/api/captures/mobile/loja-a", { headers }), {
      params: Promise.resolve({ slug: "loja-a" }),
    });
  beforeEach(() => shots.getCachedMobileScreenshots.mockResolvedValue({ mobileScreenshotPath: "/x.png" }));

  it("sem acesso: 404", async () => {
    expect((await mobile()).status).toBe(404);
  });
  it("com cookie: 200", async () => {
    expect((await mobile({ cookie })).status).toBe(200);
  });
});

it("isPublicPath aceita /api/share/", () => {
  expect(isPublicPath("/api/share/loja/unlock")).toBe(true);
});
