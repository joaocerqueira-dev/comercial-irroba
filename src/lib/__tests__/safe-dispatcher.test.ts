import dns from "node:dns";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { Agent } from "undici";
import { describe, expect, it, vi } from "vitest";
import { HOST_CACHE_MAX_ENTRIES, hostCache, LruCache } from "@/lib/net/safe-url";
import { createSafeLookup, getSafeDispatcher } from "@/lib/net/safe-dispatcher";
import { fetchPublic } from "@/lib/net/safe-fetch";

type Addr = { address: string; family: number };
const fakeResolver = (table: Record<string, Addr[]>) =>
  vi.fn((host: string, _opts: unknown, cb: (err: NodeJS.ErrnoException | null, a: Addr[]) => void) => {
    const hit = table[host];
    if (!hit) return cb(Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" }), []);
    cb(null, hit);
  });

describe("LruCache / hostCache", () => {
  it("descarta o menos usado ao passar do limite", () => {
    const lru = new LruCache<string, number>(3);
    lru.set("a", 1);
    lru.set("b", 2);
    lru.set("c", 3);
    expect(lru.get("a")).toBe(1); // "a" vira o mais recente
    lru.set("d", 4);
    expect(lru.has("b")).toBe(false);
    expect(lru.has("a")).toBe(true);
    expect(lru.size).toBe(3);
  });

  it("hostCache tem teto de 500 entradas", () => {
    expect(HOST_CACHE_MAX_ENTRIES).toBe(500);
    for (let i = 0; i < 520; i++) hostCache.set(`h${i}.exemplo.com`, { ok: true, at: 0 });
    expect(hostCache.size).toBe(500);
    expect(hostCache.has("h0.exemplo.com")).toBe(false);
    expect(hostCache.has("h519.exemplo.com")).toBe(true);
  });
});

describe("lookup seguro do undici (DNS rebinding)", () => {
  it("recusa quando o DNS resolve para IP privado", async () => {
    const lookup = createSafeLookup(fakeResolver({ "rebind.test": [{ address: "10.0.0.5", family: 4 }] }));
    const err = await new Promise<NodeJS.ErrnoException | null>((resolve) =>
      lookup("rebind.test", {}, (e) => resolve(e))
    );
    expect(err?.code).toBe("EUNSAFEADDR");
  });

  it("usa dns.lookup por padrão (mock do módulo dns)", async () => {
    const spy = vi.spyOn(dns, "lookup").mockImplementation(((
      _h: string,
      _o: unknown,
      cb: (e: null, a: Addr[]) => void
    ) => cb(null, [{ address: "169.254.169.254", family: 4 }])) as unknown as typeof dns.lookup);
    try {
      const lookup = createSafeLookup();
      const err = await new Promise<NodeJS.ErrnoException | null>((resolve) =>
        lookup("metadata.test", {}, (e) => resolve(e))
      );
      expect(spy).toHaveBeenCalledWith("metadata.test", expect.objectContaining({ all: true }), expect.any(Function));
      expect(err?.code).toBe("EUNSAFEADDR");
    } finally {
      spy.mockRestore();
    }
  });

  it("recusa se QUALQUER endereço for interno (v6 também)", async () => {
    const lookup = createSafeLookup(
      fakeResolver({ "mix.test": [{ address: "93.184.216.34", family: 4 }, { address: "::1", family: 6 }] })
    );
    const err = await new Promise<NodeJS.ErrnoException | null>((resolve) => lookup("mix.test", {}, (e) => resolve(e)));
    expect(err?.code).toBe("EUNSAFEADDR");
  });

  it("libera IP público, nos formatos all e simples", async () => {
    const lookup = createSafeLookup(fakeResolver({ "ok.test": [{ address: "93.184.216.34", family: 4 }] }));
    const single = await new Promise<unknown[]>((resolve) =>
      lookup("ok.test", {}, (e, address, family) => resolve([e, address, family]))
    );
    expect(single).toEqual([null, "93.184.216.34", 4]);
    const all = await new Promise<unknown>((resolve) => lookup("ok.test", { all: true }, (_e, a) => resolve(a)));
    expect(all).toEqual([{ address: "93.184.216.34", family: 4 }]);
  });

  it("bloqueia a conexão real quando o host passa a apontar para 127.0.0.1", async () => {
    const server = http.createServer((_req, res) => res.end("segredo interno"));
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const { port } = server.address() as AddressInfo;
    const agent = new Agent({
      connect: { lookup: createSafeLookup(fakeResolver({ "rebind.test": [{ address: "127.0.0.1", family: 4 }] })) },
    });
    try {
      const attempt = fetch(`http://rebind.test:${port}/`, { dispatcher: agent } as RequestInit);
      await expect(attempt).rejects.toThrow();
      await attempt.catch((e: { cause?: { code?: string } }) => expect(e.cause?.code).toBe("EUNSAFEADDR"));
    } finally {
      await agent.close();
      await new Promise((r) => server.close(r));
    }
  });

  it("fetchPublic usa o dispatcher seguro", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok"));
    try {
      await fetchPublic("https://93.184.216.34/");
      const init = spy.mock.calls[0][1] as RequestInit & { dispatcher?: unknown };
      expect(init.dispatcher).toBe(getSafeDispatcher());
      expect(init.redirect).toBe("manual");
    } finally {
      spy.mockRestore();
    }
  });
});
