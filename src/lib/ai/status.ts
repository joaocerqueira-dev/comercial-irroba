export interface AiStatus {
  text: boolean;
  image: "google" | "openai" | null;
}

export const NO_TEXT_AI = "Configure sua IA para gerar com IA";
export const NO_IMAGE_AI = "Configure sua IA de imagem para gerar imagens";
const IMAGE_EDIT_ONLY_GOOGLE = "Melhorar e redimensionar imagem funcionam só com IA de imagem Gemini.";

/** Motivo para desabilitar um recurso de IA, ou null se liberado. */
export function aiDisabledReason(s: AiStatus, need: "text" | "image" | "image-edit"): string | null {
  if (need === "text") return s.text ? null : NO_TEXT_AI;
  if (!s.image) return NO_IMAGE_AI;
  return need === "image-edit" && s.image !== "google" ? IMAGE_EDIT_ONLY_GOOGLE : null;
}
