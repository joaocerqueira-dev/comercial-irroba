/**
 * Rate limit e semáforo de navegador, ambos em memória.
 *
 * Suficiente para o deploy atual (um container, uma réplica). Com mais réplicas,
 * trocar a implementação por Redis mantendo as mesmas funções exportadas.
 */

// ---------------------------------------------------------------------------
// IP do cliente
// ---------------------------------------------------------------------------

/**
 * IP do cliente para chave de rate limit.
 *
 * `x-forwarded-for` só é lido com TRUST_PROXY=1, e vale o hop mais à direita
 * (o que o proxy confiável acrescentou; os da esquerda vêm do cliente e podem ser forjados).
 * Sem TRUST_PROXY, o Next 15 não expõe o IP da conexão nos route handlers, então
 * todas as requisições caem na chave "unknown".
 */
export function getClientIp(req: Request, env: Record<string, string | undefined> = process.env): string {
  if (env.TRUST_PROXY === "1") {
    const hops = (req.headers.get("x-forwarded-for") ?? "")
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    const last = hops[hops.length - 1];
    if (last) return last;
    const real = req.headers.get("x-real-ip")?.trim();
    if (real) return real;
  }
  const direct = (req as Request & { ip?: string }).ip;
  return direct || "unknown";
}

// ---------------------------------------------------------------------------
// Token bucket
// ---------------------------------------------------------------------------

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Segundos até haver 1 token disponível (0 quando ok). */
  retryAfterSec: number;
}

interface Bucket {
  tokens: number;
  last: number;
}

const MAX_TRACKED_KEYS = 5000;

export function createRateLimiter() {
  const buckets = new Map<string, Bucket>();

  // Um balde ocioso por 60s já está cheio de novo: pode ser esquecido sem mudar o resultado
  function prune(now: number) {
    for (const [key, b] of buckets) {
      if (now - b.last >= 60_000) buckets.delete(key);
    }
  }

  return {
    /** Consome 1 token de `key`; capacidade e reposição de `perMinute` por minuto. */
    take(key: string, perMinute: number, now: number = Date.now()): RateLimitResult {
      const capacity = Math.max(1, Math.floor(perMinute));
      const ratePerMs = capacity / 60_000;
      let bucket = buckets.get(key);
      if (!bucket) {
        if (buckets.size >= MAX_TRACKED_KEYS) prune(now);
        bucket = { tokens: capacity, last: now };
        buckets.set(key, bucket);
      } else {
        const elapsed = Math.max(0, now - bucket.last);
        bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * ratePerMs);
        bucket.last = now;
      }
      if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return { ok: true, remaining: Math.floor(bucket.tokens), retryAfterSec: 0 };
      }
      const retryAfterSec = Math.max(1, Math.ceil((1 - bucket.tokens) / ratePerMs / 1000));
      return { ok: false, remaining: 0, retryAfterSec };
    },
    reset() {
      buckets.clear();
    },
  };
}

const sharedLimiter = createRateLimiter();

/** Só para testes. */
export function resetRateLimits() {
  sharedLimiter.reset();
}

const DEFAULT_AUTH_PER_MIN = 30;

function envInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function tooManyRequests(retryAfterSec: number): Response {
  return new Response(
    JSON.stringify({ error: "Muitas requisições. Aguarde alguns instantes e tente novamente." }),
    {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": String(retryAfterSec) },
    }
  );
}

/**
 * Rate limit das rotas autenticadas: chave `escopo:usuário:IP` e limite generoso
 * (RATE_LIMIT_PER_MIN, padrão 30/min), porque o time comercial costuma sair pelo
 * mesmo IP de NAT. Devolve a resposta 429 pronta ou null quando liberado.
 */
export function limitAuthenticated(req: Request, scope: string): Response | null {
  const perMinute = envInt(process.env.RATE_LIMIT_PER_MIN, DEFAULT_AUTH_PER_MIN);
  const token = /(?:^|;\s*)session=([^;]*)/.exec(req.headers.get("cookie") ?? "")?.[1];
  const key = `${scope}:${token ? token.slice(0, 16) : "anon"}:${getClientIp(req)}`;
  const result = sharedLimiter.take(key, perMinute);
  return result.ok ? null : tooManyRequests(result.retryAfterSec);
}

// ---------------------------------------------------------------------------
// Semáforo de jobs do navegador
// ---------------------------------------------------------------------------

export class BrowserBusyError extends Error {
  constructor() {
    super("Servidor ocupado com outras capturas. Tente novamente em instantes.");
    this.name = "BrowserBusyError";
  }
}

interface Waiter {
  grant: () => void;
}

export interface SlotOptions {
  signal?: AbortSignal;
  /** Tempo máximo de espera na fila (não limita a execução de `fn`). */
  timeoutMs?: number;
}

export function createBrowserSemaphore(getMax: () => number) {
  let active = 0;
  const queue: Waiter[] = [];

  const dispatch = () => {
    while (queue.length > 0 && active < Math.max(1, getMax())) {
      const next = queue.shift()!;
      active++;
      next.grant();
    }
  };

  const makeRelease = () => {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      active--;
      dispatch();
    };
  };

  function acquire({ signal, timeoutMs }: SlotOptions = {}): Promise<() => void> {
    if (signal?.aborted) return Promise.reject(signal.reason);
    if (active < Math.max(1, getMax()) && queue.length === 0) {
      active++;
      return Promise.resolve(makeRelease());
    }
    return new Promise((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const cleanup = () => {
        if (timer) clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
      };
      const leave = (err: unknown) => {
        const idx = queue.indexOf(waiter);
        if (idx >= 0) queue.splice(idx, 1);
        cleanup();
        reject(err);
      };
      const onAbort = () => leave(signal?.reason);
      const waiter: Waiter = {
        grant: () => {
          cleanup();
          resolve(makeRelease());
        },
      };
      queue.push(waiter);
      signal?.addEventListener("abort", onAbort, { once: true });
      if (timeoutMs !== undefined && timeoutMs > 0) {
        timer = setTimeout(() => leave(new BrowserBusyError()), timeoutMs);
      }
    });
  }

  return {
    acquire,
    async run<T>(fn: () => Promise<T>, options: SlotOptions = {}): Promise<T> {
      const release = await acquire(options);
      try {
        return await fn();
      } finally {
        release();
      }
    },
    stats: () => ({ active, queued: queue.length }),
  };
}

const DEFAULT_MAX_BROWSER_JOBS = 2;

const browserSemaphore = createBrowserSemaphore(() =>
  envInt(process.env.MAX_BROWSER_JOBS, DEFAULT_MAX_BROWSER_JOBS)
);

/**
 * Executa `fn` com uma vaga de navegador (MAX_BROWSER_JOBS simultâneos, padrão 2).
 * Requisições canceladas saem da fila; `timeoutMs` limita a espera (BrowserBusyError).
 * Não aninhe chamadas: quem já tem uma vaga não deve pedir outra.
 */
export function withBrowserSlot<T>(fn: () => Promise<T>, options: SlotOptions = {}): Promise<T> {
  return browserSemaphore.run(fn, options);
}
