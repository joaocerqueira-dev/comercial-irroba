import { APICallError } from "ai";

/** Traduz erro do provedor em mensagem fixa PT-BR; nunca devolve o texto cru (pode ecoar a chave). */
export function describeAiError(err: unknown): string {
  const e = err as { statusCode?: unknown; status?: unknown; name?: unknown; message?: unknown } | null;
  const code = Number(APICallError.isInstance(err) ? err.statusCode : (e?.statusCode ?? e?.status));
  const text = String(e?.message ?? "").toLowerCase();
  if (e?.name === "TimeoutError" || e?.name === "AbortError" || /timeout|timed out/.test(text))
    return "A IA demorou demais para responder.";
  if (code === 402 || /insufficient_quota|billing|credit|saldo/.test(text))
    return "Sua conta de IA está sem saldo ou créditos.";
  if (code === 401 || code === 403 || /api key|invalid_api_key|unauthorized|permission/.test(text))
    return "Chave da sua IA inválida ou sem permissão. Confira em Minha IA.";
  if (code === 429 || /rate.?limit|resource_exhausted/.test(text))
    return "Limite de uso da sua IA atingido. Tente de novo em instantes.";
  if (code >= 500 || /overloaded|unavailable/.test(text))
    return "O provedor da sua IA está instável no momento. Tente de novo.";
  return "Não foi possível falar com a sua IA.";
}
