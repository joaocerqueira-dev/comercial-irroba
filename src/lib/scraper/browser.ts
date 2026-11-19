import { chromium, type Browser } from "playwright";

/** Instância única de Chromium reaproveitada entre requisições. */
let browserPromise: Promise<Browser> | null = null;

export async function getSharedBrowser(): Promise<Browser> {
  if (browserPromise) {
    const b = await browserPromise.catch(() => null);
    if (b && b.isConnected()) return b;
    browserPromise = null;
  }
  browserPromise = chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  const b = await browserPromise.catch((err) => {
    browserPromise = null;
    throw err;
  });
  b.on("disconnected", () => {
    browserPromise = null;
  });
  return b;
}
