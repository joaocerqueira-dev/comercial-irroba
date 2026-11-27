import { afterEach, describe, expect, it, vi } from "vitest";
import { suggestSharePassword } from "@/lib/auth/password";
import {
  ShareSecretMissingError,
  getShareSecret,
  resolveShareAccess,
  shareCookieHeader,
  shareCookieName,
  signShareCookie,
  verifyShareCookie,
  type ShareablePreview,
} from "@/lib/share/access";

afterEach(() => vi.unstubAllEnvs());

const now = new Date("2026-06-01T12:00:00Z");
const exp = new Date("2026-06-10T12:00:00Z");
const H = "scrypt$1$2$3$salt$hash";
const user = (o = {}) => ({ id: "u1", email: "a@b.c", name: "A", role: "comercial" as const, mustChangePassword: false, ...o });
const preview = (o: Partial<ShareablePreview> = {}): ShareablePreview => ({
  slug: "loja-a", ownerId: "u1", legacyPublic: false, shareExpiresAt: exp, sharePasswordHash: H, ...o,
});

describe("cookie assinado", () => {
  const v = signShareCookie("loja-a", H, exp);
  it("valida o próprio cookie", () => expect(verifyShareCookie(v, "loja-a", H, now)).toBe(true));
  it("rejeita outro slug", () => expect(verifyShareCookie(v, "loja-b", H, now)).toBe(false));
  it("rejeita senha trocada", () => expect(verifyShareCookie(v, "loja-a", "scrypt$other", now)).toBe(false));
  it("rejeita adulterado", () => {
    const t = v.slice(0, -1) + (v.endsWith("A") ? "B" : "A");
    expect(verifyShareCookie(t, "loja-a", H, now)).toBe(false);
  });
  it("rejeita undefined e expirado", () => {
    expect(verifyShareCookie(undefined, "loja-a", H, now)).toBe(false);
    expect(verifyShareCookie(v, "loja-a", H, new Date(exp.getTime() + 1))).toBe(false);
  });
  it("nome e header", () => {
    expect(shareCookieName("x")).toBe("share_x");
    const h = shareCookieHeader("x", "val", exp);
    expect(h).toContain("share_x=val");
    expect(h).toContain("HttpOnly");
    expect(h).toContain("SameSite=Lax");
    expect(h).toContain("Path=/");
    expect(h).toContain(`Expires=${exp.toUTCString()}`);
  });
});

describe("resolveShareAccess", () => {
  const ok = signShareCookie("loja-a", H, exp);
  it("dono e admin viram owner, mesmo expirado", () => {
    const p = preview({ shareExpiresAt: new Date("2026-01-01") });
    expect(resolveShareAccess(p, { user: user(), now })).toBe("owner");
    expect(resolveShareAccess(p, { user: user({ id: "u9", role: "admin" }), now })).toBe("owner");
  });
  it("comercial não dono é tratado como cliente", () => {
    expect(resolveShareAccess(preview(), { user: user({ id: "u9" }), now })).toBe("needs-password");
  });
  it("legacy público", () => expect(resolveShareAccess(preview({ legacyPublic: true }), { now })).toBe("public-legacy"));
  it("sem prazo ou sem hash: unavailable", () => {
    expect(resolveShareAccess(preview({ shareExpiresAt: null }), { now })).toBe("unavailable");
    expect(resolveShareAccess(preview({ sharePasswordHash: null }), { now })).toBe("unavailable");
  });
  it("expirado mesmo com cookie válido", () => {
    expect(resolveShareAccess(preview(), { cookieValue: ok, now: new Date(exp.getTime() + 1) })).toBe("expired");
  });
  it("granted e needs-password", () => {
    expect(resolveShareAccess(preview(), { cookieValue: ok, now })).toBe("granted");
    expect(resolveShareAccess(preview(), { now })).toBe("needs-password");
  });
});

describe("senha sugerida e segredo", () => {
  it("formato", () => expect(suggestSharePassword()).toMatch(/^[A-HJ-NP-Za-km-z2-9]{8}$/));
  it("produção exige SESSION_SECRET >= 32", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "");
    expect(() => getShareSecret()).toThrow(ShareSecretMissingError);
    vi.stubEnv("SESSION_SECRET", "x".repeat(31));
    expect(() => getShareSecret()).toThrow(ShareSecretMissingError);
    vi.stubEnv("SESSION_SECRET", "x".repeat(32));
    expect(getShareSecret()).toBe("x".repeat(32));
  });
});
