import dns from "node:dns/promises";
import net from "node:net";

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, oct) => (acc << 8) + Number(oct), 0) >>> 0;
}

const V4_BLOCKS: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

/** true se o IP é privado, loopback, link-local, reservado ou multicast. */
export function isPrivateIp(ip: string): boolean {
  const kind = net.isIP(ip);
  if (kind === 4) {
    const n = ipv4ToInt(ip);
    return V4_BLOCKS.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (n & mask) === (ipv4ToInt(base) & mask);
    });
  }
  if (kind === 6) {
    const lower = ip.toLowerCase();
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    if (lower === "::" || lower === "::1") return true;
    if (/^f[cd]/.test(lower)) return true; // fc00::/7
    if (/^fe[89ab]/.test(lower)) return true; // fe80::/10
    if (lower.startsWith("ff")) return true; // multicast
    if (lower.startsWith("2001:db8")) return true;
    return false;
  }
  return true;
}

const hostCache = new Map<string, { ok: boolean; at: number }>();

/** Valida esquema http(s) e resolve DNS, bloqueando destinos internos. Lança UnsafeUrlError. */
export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("URL inválida.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("Apenas URLs http(s) são permitidas.");
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError("URLs com credenciais não são permitidas.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    throw new UnsafeUrlError("Endereço interno não permitido.");
  }
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new UnsafeUrlError("Endereço IP interno não permitido.");
    return url;
  }
  const cached = hostCache.get(host);
  if (cached && Date.now() - cached.at < 60_000) {
    if (!cached.ok) throw new UnsafeUrlError("Endereço interno não permitido.");
    return url;
  }
  let addrs: { address: string }[];
  try {
    addrs = await dns.lookup(host, { all: true });
  } catch {
    throw new UnsafeUrlError("Não foi possível resolver o domínio.");
  }
  const ok = addrs.length > 0 && addrs.every((a) => !isPrivateIp(a.address));
  hostCache.set(host, { ok, at: Date.now() });
  if (!ok) throw new UnsafeUrlError("Endereço interno não permitido.");
  return url;
}

export async function isPublicHttpUrl(raw: string): Promise<boolean> {
  try {
    await assertPublicHttpUrl(raw);
    return true;
  } catch {
    return false;
  }
}
