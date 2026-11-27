import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { canAccessPreview, getOptionalUser } from "@/lib/auth/guard";
import type { AuthUser } from "@/lib/auth/session";

export type ShareAccess = "owner" | "granted" | "public-legacy" | "needs-password" | "expired" | "unavailable";

export interface ShareablePreview {
  slug: string;
  ownerId: string | null;
  legacyPublic: boolean;
  shareExpiresAt: Date | null;
  sharePasswordHash: string | null;
}

export class ShareSecretMissingError extends Error {
  constructor() {
    super("SESSION_SECRET ausente ou com menos de 32 caracteres (obrigatório em produção).");
  }
}

const DEV_SECRET = "dev-share-secret-dev-share-secret";
let warned = false;

export function getShareSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!s || s.length < 32) throw new ShareSecretMissingError();
    return s;
  }
  if (s && s.length >= 32) return s;
  if (!warned) {
    warned = true;
    console.warn("[share] SESSION_SECRET ausente: usando segredo de desenvolvimento.");
  }
  return DEV_SECRET;
}

export const shareCookieName = (slug: string) => `share_${slug}`;

const pwTag = (passwordHash: string) => createHash("sha256").update(passwordHash).digest("hex").slice(0, 8);
const mac = (slug: string, expMs: number | string, tag: string) =>
  createHmac("sha256", getShareSecret()).update(`${slug}|${expMs}|${tag}`).digest("base64url");

export function signShareCookie(slug: string, passwordHash: string, expiresAt: Date): string {
  const expMs = expiresAt.getTime();
  const tag = pwTag(passwordHash);
  return `${expMs}.${tag}.${mac(slug, expMs, tag)}`;
}

export function verifyShareCookie(
  value: string | undefined,
  slug: string,
  passwordHash: string,
  now: Date = new Date(),
): boolean {
  if (!value) return false;
  const [expMs, tag, got, extra] = value.split(".");
  if (!expMs || !tag || !got || extra !== undefined) return false;
  if (!/^\d+$/.test(expMs) || +expMs <= now.getTime()) return false;
  if (tag !== pwTag(passwordHash)) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(mac(slug, expMs, tag));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function shareCookieHeader(slug: string, value: string, expiresAt: Date): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${shareCookieName(slug)}=${value}; HttpOnly; SameSite=Lax; Path=/; Expires=${expiresAt.toUTCString()}${secure}`;
}

export function resolveShareAccess(
  p: ShareablePreview,
  opts: { cookieValue?: string; user?: AuthUser | null; now?: Date },
): ShareAccess {
  const now = opts.now ?? new Date();
  if (opts.user && canAccessPreview(opts.user, p.ownerId)) return "owner";
  if (p.legacyPublic) return "public-legacy";
  if (!p.shareExpiresAt || !p.sharePasswordHash) return "unavailable";
  if (p.shareExpiresAt.getTime() <= now.getTime()) return "expired";
  return verifyShareCookie(opts.cookieValue, p.slug, p.sharePasswordHash, now) ? "granted" : "needs-password";
}

export const SHARE_SECRET_MISSING = "Compartilhamento indisponível: defina SESSION_SECRET.";

/** Roda o handler; sem SESSION_SECRET em produção responde 503 em vez de 500. */
export async function withShareSecret(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ShareSecretMissingError) return Response.json({ error: SHARE_SECRET_MISSING }, { status: 503 });
    throw e;
  }
}

/** A requisição pode ver a proposta (dono/admin, cookie válido ou proposta antiga pública)? */
export async function requestCanView(req: NextRequest, p: ShareablePreview): Promise<boolean> {
  const access = resolveShareAccess(p, {
    cookieValue: req.cookies.get(shareCookieName(p.slug))?.value,
    user: await getOptionalUser(req),
  });
  return access === "owner" || access === "granted" || access === "public-legacy";
}
