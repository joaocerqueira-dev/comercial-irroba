import dns from "node:dns";
import type { LookupAddress, LookupOptions } from "node:dns";
import { Agent } from "undici";
import { isPrivateIp, UnsafeUrlError } from "./safe-url";

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | LookupAddress[],
  family?: number
) => void;

type Resolver = (
  hostname: string,
  options: LookupOptions & { all: true },
  callback: (err: NodeJS.ErrnoException | null, addresses: LookupAddress[]) => void
) => void;

/**
 * `lookup` para o socket do undici que valida o IP resolvido NA HORA DA CONEXÃO.
 *
 * `assertPublicHttpUrl` resolve o DNS antes do fetch, mas o fetch resolve de novo ao
 * conectar: um domínio com TTL curto pode responder um IP público na checagem e um
 * privado na conexão (DNS rebinding). Aqui a checagem acontece no mesmo lookup que
 * o socket usa, então não há janela entre validar e conectar.
 *
 * Limitação: vale só para o `fetch` do Node (fetchPublic). O Chromium do Playwright
 * tem resolvedor DNS próprio e não passa por aqui. Lá a defesa é o `page.route` com
 * a checagem de `response.url()` (page-guard.ts), o sandbox do container e,
 * opcionalmente, a regra de egress descrita em docs/deploy.md.
 */
export function createSafeLookup(resolve: Resolver = dns.lookup as unknown as Resolver) {
  return function safeLookup(hostname: string, options: LookupOptions, callback: LookupCallback): void {
    resolve(hostname, { ...options, all: true }, (err, addresses) => {
      if (err) return callback(err, []);
      const list = Array.isArray(addresses) ? addresses : [];
      if (list.length === 0) {
        const notFound = Object.assign(new Error(`ENOTFOUND ${hostname}`), { code: "ENOTFOUND" });
        return callback(notFound, []);
      }
      const blocked = list.find((a) => isPrivateIp(a.address));
      if (blocked) {
        return callback(
          Object.assign(new UnsafeUrlError("Endereço interno não permitido."), { code: "EUNSAFEADDR" }),
          []
        );
      }
      if (options.all) return callback(null, list);
      return callback(null, list[0].address, list[0].family);
    });
  };
}

let agent: Agent | null = null;

/** Dispatcher do undici com o lookup seguro (singleton, reaproveita conexões). */
export function getSafeDispatcher(): Agent {
  if (!agent) {
    agent = new Agent({ connect: { lookup: createSafeLookup() } });
  }
  return agent;
}
