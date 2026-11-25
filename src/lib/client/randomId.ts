/**
 * Id aleatório para uso no navegador. `crypto.randomUUID()` só existe em contexto
 * seguro (HTTPS ou localhost); em HTTP comum o Studio quebraria. Cai para
 * `crypto.getRandomValues` e, sem Web Crypto, para Date.now + Math.random
 * (basta para âncoras/ids locais, não serve para segredo).
 */
export function randomId(): string {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  if (c && typeof c.getRandomValues === "function") {
    const bytes = c.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}
