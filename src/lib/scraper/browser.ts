import { chromium, type Browser, type LaunchOptions } from "playwright";

/**
 * Opções de launch do Chromium. O sandbox fica LIGADO por padrão
 * (o Playwright o desliga se `chromiumSandbox` não for informado).
 * PLAYWRIGHT_NO_SANDBOX=1 é só um escape para dev em WSL/CI ou container sem
 * perfil seccomp adequado: o Chromium abre páginas de terceiros.
 */
export function chromiumLaunchOptions(env: Record<string, string | undefined> = process.env): LaunchOptions {
  const noSandbox = env.PLAYWRIGHT_NO_SANDBOX === "1";
  return {
    headless: true,
    chromiumSandbox: !noSandbox,
    args: noSandbox
      ? ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
      : ["--disable-dev-shm-usage"],
  };
}

/** Instância única de Chromium reaproveitada entre requisições. */
let browserPromise: Promise<Browser> | null = null;

function launchShared(): Promise<Browser> {
  const launching: Promise<Browser> = chromium
    .launch(chromiumLaunchOptions())
    .then((browser) => {
      browser.on("disconnected", () => {
        // Só zera se ainda for esta instância (uma nova pode já ter sido lançada)
        if (browserPromise === launching) browserPromise = null;
      });
      return browser;
    })
    .catch((err: unknown) => {
      if (browserPromise === launching) browserPromise = null;
      const message = err instanceof Error ? err.message : String(err);
      if (/sandbox/i.test(message)) {
        console.error(
          "[browser] O Chromium não abriu com sandbox. Use a imagem oficial do Playwright com usuário não-root " +
            "e perfil seccomp, ou, como último recurso, PLAYWRIGHT_NO_SANDBOX=1."
        );
      }
      throw err;
    });
  browserPromise = launching;
  return launching;
}

export async function getSharedBrowser(): Promise<Browser> {
  // Chamadas concorrentes compartilham a mesma promise de launch
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = browserPromise ?? launchShared();
    const browser = await current;
    if (browser.isConnected()) return browser;
    if (browserPromise === current) browserPromise = null;
  }
  return launchShared();
}
