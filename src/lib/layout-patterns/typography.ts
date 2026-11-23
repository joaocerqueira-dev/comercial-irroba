/** Padrões tipográficos. */
import type { StoreBlueprint } from "@/lib/types/blueprint";

export interface FontPairing {
  heading: string;
  body: string;
  /** Prefixos de palavra (sem acento) que selecionam este par quando aparecem no texto da loja. */
  niches: readonly string[];
}

export const FONT_PAIRINGS = {
  elegant: {
    heading: "Cormorant Garamond",
    body: "Jost",
    niches: ["moda", "boutique", "joia", "semijoia", "relogio", "decoracao", "luxo"],
  },
  editorial: {
    heading: "Playfair Display",
    body: "Lora",
    niches: ["beleza", "cosmetic", "perfum", "skincare", "artesanal", "vegan", "sustent", "organic", "natural"],
  },
  sporty: {
    heading: "Montserrat",
    body: "Poppins",
    niches: ["calcado", "tenis", "fitness", "suplement", "whey", "esporte", "academia", "corrida"],
  },
  tech: {
    heading: "Oswald",
    body: "Cabin",
    niches: ["tech", "eletronic", "gamer", "ferramenta", "informatica", "celular", "notebook"],
  },
  neutral: { heading: "Poppins", body: "Poppins", niches: [] },
} as const satisfies Record<string, FontPairing>;

/**
 * Ordem de prioridade na busca por nicho: o primeiro par com palavra-chave encontrada vence.
 * "elegant" vem antes de "editorial" (joalheria que também vende perfume continua elegante) e
 * "editorial" antes de "sporty" (calçados veganos recebem a tipografia editorial do tom "minimal").
 */
export const FONT_PAIRING_PRIORITY: ReadonlyArray<keyof typeof FONT_PAIRINGS> = [
  "tech",
  "elegant",
  "editorial",
  "sporty",
];

/** Tom → par de fontes, usado quando nenhum nicho é reconhecido no texto da loja. */
export const TONE_FONT_PAIRING: Record<StoreBlueprint["brand"]["tone"], FontPairing> = {
  luxury: FONT_PAIRINGS.elegant,
  minimal: FONT_PAIRINGS.editorial,
  tech: FONT_PAIRINGS.tech,
  modern: FONT_PAIRINGS.sporty,
  vibrant: FONT_PAIRINGS.sporty,
};
export const DEFAULT_FONT_PAIRING: FontPairing = FONT_PAIRINGS.sporty;

function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Escolhe o par pelo texto da loja (nichos) e, sem correspondência, pelo tom. */
export function pickFontPairingForStore(
  storeText: string,
  tone: StoreBlueprint["brand"]["tone"]
): FontPairing {
  const text = normalizeText(storeText);
  for (const key of FONT_PAIRING_PRIORITY) {
    const pairing = FONT_PAIRINGS[key];
    if (pairing.niches.some((kw) => new RegExp(`\\b${kw}`).test(text))) return pairing;
  }
  return TONE_FONT_PAIRING[tone] ?? DEFAULT_FONT_PAIRING;
}

/** Fontes do sistema: se a loja usa uma destas, aplicamos o par por nicho/tom. */
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

/** Fontes que a IA pode sugerir para títulos. */
export const ALLOWED_HEADING_FONTS = [
  "Cormorant Garamond",
  "Playfair Display",
  "Montserrat",
  "Poppins",
  "Oswald",
  "Anton",
  "Lato",
] as const;
/** Fontes que a IA pode sugerir para o corpo do texto. */
export const ALLOWED_BODY_FONTS = ["Jost", "Lora", "Poppins", "Cabin", "Roboto", "Manrope"] as const;

/** Todas as fontes suportadas (IA + seletor do Studio). Única fonte da verdade. */
export const ALLOWED_FONTS: readonly string[] = Array.from(
  new Set<string>([...ALLOWED_HEADING_FONTS, ...ALLOWED_BODY_FONTS])
);

/** Retorna o nome canônico se a fonte estiver na lista; caso contrário, undefined. */
export function matchAllowedFont(name: unknown, allowed: readonly string[] = ALLOWED_FONTS): string | undefined {
  if (typeof name !== "string") return undefined;
  const wanted = name.trim().toLowerCase();
  return allowed.find((f) => f.toLowerCase() === wanted);
}
