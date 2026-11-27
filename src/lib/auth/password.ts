import { randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";

const N = 16384, R = 8, P = 1, KEYLEN = 64;
// sem 0 O 1 l I
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function derive(plain: string, salt: Buffer, n: number, r: number, p: number, keylen: number) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(plain, salt, keylen, { N: n, r, p }, (e, k) => (e ? reject(e) : resolve(k))),
  );
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(plain, salt, N, R, P, KEYLEN);
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  try {
    const [alg, n, r, p, salt, hash] = stored.split("$");
    if (alg !== "scrypt" || !hash) return false;
    const expected = Buffer.from(hash, "base64");
    const got = await derive(plain, Buffer.from(salt, "base64"), +n, +r, +p, expected.length);
    return got.length === expected.length && timingSafeEqual(got, expected);
  } catch {
    return false;
  }
}

export function generateTempPassword(): string {
  return Array.from({ length: 12 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
}
