/** Gerado com IA? `"gemini"` é o valor legado das propostas antigas. */
export function isAiMode(mode: string | null | undefined): boolean {
  return mode === "ai" || mode === "gemini";
}
