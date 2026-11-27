/** Parâmetros dos modelos de IA usados na geração. */
export const GEMINI_DEFAULT_MODEL = "gemini-3.5-flash";
export const GEMINI_TEXT_MODELS = [GEMINI_DEFAULT_MODEL, "gemini-3.5-flash-lite", "gemini-flash-latest"] as const;
export const AI_ARCHITECT = { temperature: 0.25, timeoutMs: 35_000 } as const;
