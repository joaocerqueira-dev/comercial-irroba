/** Padrões tipográficos. */
import type { StoreBlueprint } from "@/lib/types/blueprint";

export interface FontPairing {
  heading: string;
  body: string;
  /** Documentação apenas: nichos pensados para o par (não usado na escolha). */
  niches: readonly string[];
}

export const FONT_PAIRINGS = {
  elegant: { heading: "Cormorant Garamond", body: "Jost", niches: ["moda", "boutique", "joia", "decoracao", "luxo"] },
  editorial: { heading: "Playfair Display", body: "Lora", niches: ["beleza", "cosmetico", "perfum", "artesanal"] },
  sporty: { heading: "Montserrat", body: "Poppins", niches: ["calcado", "vegano", "fitness", "suplemento", "esporte"] },
  tech: { heading: "Oswald", body: "Cabin", niches: ["tech", "eletronico", "gamer", "ferramenta", "auto"] },
  neutral: { heading: "Poppins", body: "Poppins", niches: ["geral"] },
} as const satisfies Record<string, FontPairing>;

/**
 * Tom → par de fontes usado quando a loja não tem fontes próprias.
 * Mantido idêntico ao comportamento original (ver pendências no README).
 */
export const TONE_FONT_PAIRING: Record<StoreBlueprint["brand"]["tone"], FontPairing> = {
  luxury: FONT_PAIRINGS.elegant,
  minimal: FONT_PAIRINGS.sporty,
  tech: FONT_PAIRINGS.tech,
  modern: FONT_PAIRINGS.sporty,
  vibrant: FONT_PAIRINGS.sporty,
};
export const DEFAULT_FONT_PAIRING: FontPairing = FONT_PAIRINGS.sporty;

/** Fontes do sistema: se a loja usa uma destas, aplicamos o par por tom. */
export const SYSTEM_FONTS = [
  "arial",
  "helvetica",
  "sans-serif",
  "serif",
  "system-ui",
  "-apple-system",
  "times new roman",
] as const;

/** Fallbacks finais do compilador/sanitizador. */
export const FONT_FALLBACKS = { heading: "Montserrat", body: "Poppins" } as const;

export const SERIF_FONT_PATTERN =
  /garamond|playfair|lora|merriweather|serif|baskerville|bodoni|didot|libre caslon|crimson|prata|cinzel|dm serif|fraunces/i;
