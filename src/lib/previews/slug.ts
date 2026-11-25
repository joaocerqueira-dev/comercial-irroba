import crypto from "node:crypto";

/** Teto do trecho do hostname no slug (o slug também vira nome de arquivo). */
export const SLUG_HOST_MAX_LENGTH = 60;

/** Slug único do preview: hostname normalizado (até 60 caracteres) + sufixo aleatório. */
export function slugifyHostname(rawUrl: string): string {
  try {
    const u = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
    const base = u.hostname
      .replace(/^www\./, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, SLUG_HOST_MAX_LENGTH)
      .replace(/-+$/, "");
    const suffix = crypto.randomBytes(3).toString("hex");
    return `${base || "loja"}-${suffix}`;
  } catch {
    return `loja-${crypto.randomBytes(4).toString("hex")}`;
  }
}
