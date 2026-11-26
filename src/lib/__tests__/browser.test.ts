import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

class FakeBrowser extends EventEmitter {
  connected = true;
  isConnected() {
    return this.connected;
  }
  disconnect() {
    this.connected = false;
    this.emit("disconnected");
  }
}

const pw = vi.hoisted(() => ({ launch: vi.fn() }));
vi.mock("playwright", () => ({ chromium: { launch: pw.launch } }));

beforeEach(() => {
  vi.resetModules();
  pw.launch.mockReset();
});

describe("chromiumLaunchOptions", () => {
  it("liga o sandbox por padrão e só desliga com PLAYWRIGHT_NO_SANDBOX=1", async () => {
    const { chromiumLaunchOptions } = await import("@/lib/scraper/browser");
    const def = chromiumLaunchOptions({});
    expect(def.chromiumSandbox).toBe(true);
    expect(def.args).not.toContain("--no-sandbox");
    expect(def.args).not.toContain("--disable-setuid-sandbox");
    const escape = chromiumLaunchOptions({ PLAYWRIGHT_NO_SANDBOX: "1" });
    expect(escape.chromiumSandbox).toBe(false);
    expect(escape.args).toContain("--no-sandbox");
  });
});

describe("getSharedBrowser", () => {
  it("chamadas concorrentes compartilham um único launch", async () => {
    const b = new FakeBrowser();
    pw.launch.mockImplementation(() => new Promise((r) => setTimeout(() => r(b), 5)));
    const { getSharedBrowser } = await import("@/lib/scraper/browser");
    const [x, y, z] = await Promise.all([getSharedBrowser(), getSharedBrowser(), getSharedBrowser()]);
    expect(pw.launch).toHaveBeenCalledTimes(1);
    expect(x).toBe(b);
    expect(y).toBe(b);
    expect(z).toBe(b);
  });

  it("disconnected de uma instância antiga não derruba a nova", async () => {
    const old = new FakeBrowser();
    const fresh = new FakeBrowser();
    pw.launch.mockResolvedValueOnce(old).mockResolvedValueOnce(fresh);
    const { getSharedBrowser } = await import("@/lib/scraper/browser");
    expect(await getSharedBrowser()).toBe(old);
    old.connected = false; // caiu, mas o evento ainda não chegou
    expect(await getSharedBrowser()).toBe(fresh);
    old.emit("disconnected"); // evento atrasado da instância velha
    expect(await getSharedBrowser()).toBe(fresh);
    expect(pw.launch).toHaveBeenCalledTimes(2);
  });

  it("falha no launch não fica em cache", async () => {
    const b = new FakeBrowser();
    pw.launch.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(b);
    const { getSharedBrowser } = await import("@/lib/scraper/browser");
    await expect(getSharedBrowser()).rejects.toThrow("boom");
    expect(await getSharedBrowser()).toBe(b);
  });
});

describe("checkChromiumAtBoot", () => {
  it("não roda em NODE_ENV=test", async () => {
    const { checkChromiumAtBoot } = await import("@/lib/scraper/browser");
    expect(await checkChromiumAtBoot({ NODE_ENV: "test" })).toBeNull();
    expect(pw.launch).not.toHaveBeenCalled();
  });

  it("abre e fecha o Chromium com o sandbox ligado", async () => {
    const close = vi.fn(async () => undefined);
    pw.launch.mockResolvedValue({ close });
    const { checkChromiumAtBoot } = await import("@/lib/scraper/browser");
    expect(await checkChromiumAtBoot({ NODE_ENV: "production" })).toBe(true);
    expect(pw.launch).toHaveBeenCalledWith(expect.objectContaining({ chromiumSandbox: true }));
    expect(close).toHaveBeenCalled();
  });

  it("falha vira log com a solução, sem lançar", async () => {
    pw.launch.mockRejectedValue(new Error("No usable sandbox!"));
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { checkChromiumAtBoot } = await import("@/lib/scraper/browser");
    await expect(checkChromiumAtBoot({ NODE_ENV: "production" })).resolves.toBe(false);
    const logged = err.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logged).toContain("No usable sandbox!");
    expect(logged).toContain("seccomp-chromium.json");
    err.mockRestore();
  });
});
