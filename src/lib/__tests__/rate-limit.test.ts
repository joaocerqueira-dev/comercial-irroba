import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  BrowserBusyError,
  createBrowserSemaphore,
  createRateLimiter,
  getClientIp,
  resetRateLimits,
} from "@/lib/net/rate-limit";

const db = vi.hoisted(() => ({
  storePreview: { findUnique: vi.fn(async () => null), update: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ prisma: db }));

import { POST as REANALYZE } from "@/app/api/previews/[id]/reanalyze/route";

const reqWith = (headers: Record<string, string>) =>
  new Request("http://localhost/api/x", { method: "POST", headers });

beforeEach(() => resetRateLimits());
afterEach(() => vi.unstubAllEnvs());

describe("getClientIp", () => {
  it("ignora X-Forwarded-For sem TRUST_PROXY (header forjável)", () => {
    const req = reqWith({ "x-forwarded-for": "1.2.3.4" });
    expect(getClientIp(req, {})).toBe("unknown");
  });
  it("com TRUST_PROXY=1 usa o hop mais à direita", () => {
    const req = reqWith({ "x-forwarded-for": "6.6.6.6, 10.0.0.1, 203.0.113.9" });
    expect(getClientIp(req, { TRUST_PROXY: "1" })).toBe("203.0.113.9");
  });
  it("com TRUST_PROXY=1 e sem header cai para x-real-ip ou unknown", () => {
    expect(getClientIp(reqWith({ "x-real-ip": "9.9.9.9" }), { TRUST_PROXY: "1" })).toBe(
      "9.9.9.9"
    );
    expect(getClientIp(reqWith({}), { TRUST_PROXY: "1" })).toBe("unknown");
  });
});

describe("token bucket", () => {
  it("esgota, devolve Retry-After e repõe com o tempo", () => {
    const rl = createRateLimiter();
    const t0 = 1_000_000;
    expect(rl.take("k", 2, t0).ok).toBe(true);
    expect(rl.take("k", 2, t0).ok).toBe(true);
    const blocked = rl.take("k", 2, t0);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBe(30);
    expect(rl.take("outra", 2, t0).ok).toBe(true);
    expect(rl.take("k", 2, t0 + 30_000).ok).toBe(true);
  });
});

describe("429 nas rotas autenticadas", () => {
  it("reanalyze responde 429 com Retry-After após o limite, por usuário+IP", async () => {
    vi.stubEnv("RATE_LIMIT_PER_MIN", "2");
    const call = (user: string) =>
      REANALYZE(
        new NextRequest("http://localhost/api/previews/abc/reanalyze", {
          method: "POST",
          headers: { cookie: `session=${user}` },
        }),
        { params: Promise.resolve({ id: "abc" }) }
      );
    expect((await call("ana")).status).toBe(404);
    expect((await call("ana")).status).toBe(404);
    const limited = await call("ana");
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("Retry-After"))).toBeGreaterThan(0);
    // outro vendedor atrás do mesmo NAT não é afetado
    expect((await call("bruno")).status).toBe(404);
  });
});

describe("withBrowserSlot (semáforo)", () => {
  const deferred = () => {
    let resolve!: () => void;
    const promise = new Promise<void>((r) => (resolve = r));
    return { promise, resolve };
  };

  it("limita a concorrência e libera a fila em ordem", async () => {
    const sem = createBrowserSemaphore(() => 2);
    let running = 0;
    let peak = 0;
    const gates = [deferred(), deferred(), deferred()];
    const jobs = gates.map((g, i) =>
      sem.run(async () => {
        running++;
        peak = Math.max(peak, running);
        await g.promise;
        running--;
        return i;
      })
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(sem.stats()).toEqual({ active: 2, queued: 1 });
    gates[0].resolve();
    await jobs[0];
    await new Promise((r) => setTimeout(r, 0));
    expect(sem.stats()).toEqual({ active: 2, queued: 0 });
    gates[1].resolve();
    gates[2].resolve();
    expect(await Promise.all(jobs)).toEqual([0, 1, 2]);
    expect(peak).toBe(2);
    expect(sem.stats()).toEqual({ active: 0, queued: 0 });
  });

  it("remove da fila a requisição abortada sem executar fn", async () => {
    const sem = createBrowserSemaphore(() => 1);
    const gate = deferred();
    const first = sem.run(() => gate.promise);
    const controller = new AbortController();
    const fn = vi.fn(async () => "nunca");
    const queued = sem.run(fn, { signal: controller.signal });
    expect(sem.stats().queued).toBe(1);
    controller.abort(new Error("cancelado"));
    await expect(queued).rejects.toThrow("cancelado");
    expect(sem.stats().queued).toBe(0);
    gate.resolve();
    await first;
    expect(fn).not.toHaveBeenCalled();
    expect(sem.stats()).toEqual({ active: 0, queued: 0 });
  });

  it("estoura o tempo de espera com BrowserBusyError e libera a vaga se fn falhar", async () => {
    const sem = createBrowserSemaphore(() => 1);
    const gate = deferred();
    const first = sem.run(async () => {
      await gate.promise;
      throw new Error("falhou");
    });
    await expect(sem.run(async () => 1, { timeoutMs: 10 })).rejects.toBeInstanceOf(BrowserBusyError);
    gate.resolve();
    await expect(first).rejects.toThrow("falhou");
    expect(await sem.run(async () => "ok")).toBe("ok");
  });

  it("rejeita na hora se o sinal já estiver abortado", async () => {
    const sem = createBrowserSemaphore(() => 2);
    await expect(sem.run(async () => 1, { signal: AbortSignal.abort(new Error("x")) })).rejects.toThrow("x");
    expect(sem.stats()).toEqual({ active: 0, queued: 0 });
  });
});
