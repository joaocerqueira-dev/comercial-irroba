// Sem imports do SDK: seguro para o cliente.
export type AiProvider = "openai" | "anthropic" | "google" | "openai-compatible";
export type AiPurpose = "texto" | "imagem";

export const DEFAULT_TEXT_MODELS: Record<AiProvider, string | null> = {
  openai: "gpt-5.4-mini",
  anthropic: "claude-sonnet-5-5",
  google: "gemini-3.5-flash",
  "openai-compatible": null,
};
export const DEFAULT_IMAGE_MODELS = { google: "gemini-3.1-flash-image", openai: "gpt-image-1.5" };
export const IMAGE_PROVIDERS = ["google", "openai"] as const;

/** A chave de texto só serve para imagem em Google e OpenAI. */
export const canReuseTextKey = (text: { provider: string } | null | undefined) =>
  !!text && (IMAGE_PROVIDERS as readonly string[]).includes(text.provider);
