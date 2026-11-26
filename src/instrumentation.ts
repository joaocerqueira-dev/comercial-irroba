/**
 * Hook de boot do Next (roda uma vez por processo do servidor).
 * Limpa gerações que ficaram presas em "processing" quando o servidor caiu no meio e
 * confere se o Chromium abre (só loga; não derruba o servidor).
 */
export async function register() {
  // Padrão recomendado pelo Next: o import dinâmico dentro do if fica fora do bundle edge
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { cleanupStalePreviewsThrottled } = await import("@/lib/previews/maintenance");
    // Não segura o boot: a limpeza é best-effort e roda em segundo plano
    void cleanupStalePreviewsThrottled().then((n) => {
      if (n > 0) console.log(`[boot] ${n} preview(s) preso(s) em processing removido(s).`);
    });
    // Sandbox/seccomp quebrado aparece no log da subida, não só na primeira geração
    if (process.env.NODE_ENV !== "test") {
      void import("@/lib/scraper/browser")
        .then(({ checkChromiumAtBoot }) => checkChromiumAtBoot())
        .catch((err: unknown) => console.error("[boot] Checagem do Chromium falhou:", err));
    }
  }
}
