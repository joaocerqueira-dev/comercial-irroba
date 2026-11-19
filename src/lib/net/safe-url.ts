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

/** Converte um IPv6 (com ou sem IPv4 embutido, zona opcional) para 16 bytes. */
export function ipv6ToBytes(raw: string): number[] | null {
  let ip = raw.toLowerCase().replace(/^\[|\]$/g, "");
  const zone = ip.indexOf("%");
  if (zone >= 0) ip = ip.slice(0, zone);
  if (net.isIP(ip) !== 6) return null;

  let tailV4: number[] = [];
  const lastColon = ip.lastIndexOf(":");
  const tail = ip.slice(lastColon + 1);
  if (tail.includes(".")) {
    tailV4 = tail.split(".").map(Number);
    ip = `${ip.slice(0, lastColon + 1)}0:0`;
  }

  const [headRaw, tailRaw] = ip.split("::");
  const parse = (part: string | undefined) => (part ? part.split(":").filter((p) => p !== "") : []);
  const head = parse(headRaw);
  const rest = ip.includes("::") ? parse(tailRaw) : [];
  const groups = ip.includes("::")
    ? [...head, ...Array(8 - head.length - rest.length).fill("0"), ...rest]
    : head;
  if (groups.length !== 8) return null;

  const bytes: number[] = [];
  for (const g of groups) {
    const n = parseInt(g, 16);
    if (!Number.isFinite(n) || n < 0 || n > 0xffff) return null;
    bytes.push(n >> 8, n & 0xff);
  }
  if (tailV4.length === 4) bytes.splice(12, 4, ...tailV4);
  return bytes;
}

/**
 * IPv4 embutido em formatos de transição que o kernel/proxy pode rotear para v4:
 * ::ffff:0:0/96 (mapeado), ::a.b.c.d (compatível), 64:ff9b::/96 (NAT64) e 2002::/16 (6to4).
 */
function embeddedIpv4(b: number[]): string | null {
  const v4 = (o: number) => `${b[o]}.${b[o + 1]}.${b[o + 2]}.${b[o + 3]}`;
  const zeros = (from: number, to: number) => b.slice(from, to).every((x) => x === 0);
  if (zeros(0, 10) && b[10] === 0xff && b[11] === 0xff) return v4(12); // ::ffff:a.b.c.d
  if (zeros(0, 12) && !(zeros(12, 15) && (b[15] === 0 || b[15] === 1))) return v4(12); // ::a.b.c.d
  if (b[0] === 0x00 && b[1] === 0x64 && b[2] === 0xff && b[3] === 0x9b && zeros(4, 12)) return v4(12); // 64:ff9b::/96
  if (b[0] === 0x20 && b[1] === 0x02) return v4(2); // 2002::/16
  return null;
}

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
    const bytes = ipv6ToBytes(ip);
    if (!bytes) return true;
    const embedded = embeddedIpv4(bytes);
    if (embedded) return isPrivateIp(embedded);
    if (bytes.every((b) => b === 0)) return true; // ::
    if (bytes.slice(0, 15).every((b) => b === 0) && bytes[15] === 1) return true; // ::1
    if ((bytes[0] & 0xfe) === 0xfc) return true; // fc00::/7
    if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return true; // fe80::/10
    if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0xc0) return true; // fec0::/10 (site-local)
    if (bytes[0] === 0xff) return true; // multicast
    if (bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0x0d && bytes[3] === 0xb8) return true; // 2001:db8::/32
    if (bytes[0] === 0x01 && bytes[1] === 0x00 && bytes.slice(2, 8).every((b) => b === 0)) return true; // 100::/64
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
