import { describe, it, expect, vi, beforeEach } from "vitest";
import { TEST_USERS, withSession } from "./fixtures";

const getUserFromToken = vi.fn();
vi.mock("@/lib/auth/session", () => ({ SESSION_COOKIE: "session", getUserFromToken: (t: string) => getUserFromToken(t) }));

import { requireUser, requireAdmin, canAccessPreview } from "@/lib/auth/guard";

const req = (init?: RequestInit) => new Request("http://x/api", init);

beforeEach(() => {
  getUserFromToken.mockReset();
  getUserFromToken.mockImplementation(async (t: string) => (t === "test" ? TEST_USERS.comercial : null));
});

describe("requireUser", () => {
  it("sem cookie -> 401", async () => {
    const r = (await requireUser(req())) as Response;
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ error: "Sessão expirada. Entre novamente." });
  });
  it("token desconhecido -> 401", async () => {
    const r = (await requireUser(req({ headers: { cookie: "a=b; session=zzz" } }))) as Response;
    expect(r.status).toBe(401);
  });
  it("usuário válido (outros cookies presentes)", async () => {
    const u = await requireUser(req({ headers: { cookie: "a=b; session=test" } }));
    expect(u).toEqual(TEST_USERS.comercial);
  });
  it("mustChangePassword -> 403, liberado com allowMustChange", async () => {
    getUserFromToken.mockResolvedValue({ ...TEST_USERS.comercial, mustChangePassword: true });
    const r = (await requireUser(req(withSession()))) as Response;
    expect(r.status).toBe(403);
    expect((await r.json()).code).toBe("MUST_CHANGE_PASSWORD");
    const u = await requireUser(req(withSession()), { allowMustChange: true });
    expect((u as { id: string }).id).toBe("u-comercial");
  });
});

describe("requireAdmin", () => {
  it("comercial -> 403", async () => {
    expect(((await requireAdmin(req(withSession()))) as Response).status).toBe(403);
  });
  it("admin -> usuário", async () => {
    getUserFromToken.mockResolvedValue(TEST_USERS.admin);
    expect(await requireAdmin(req(withSession()))).toEqual(TEST_USERS.admin);
  });
});

describe("canAccessPreview", () => {
  it("regras", () => {
    expect(canAccessPreview(TEST_USERS.admin, null)).toBe(true);
    expect(canAccessPreview(TEST_USERS.admin, "u-outro")).toBe(true);
    expect(canAccessPreview(TEST_USERS.comercial, "u-comercial")).toBe(true);
    expect(canAccessPreview(TEST_USERS.comercial, "u-outro")).toBe(false);
    expect(canAccessPreview(TEST_USERS.comercial, null)).toBe(false);
  });
});
