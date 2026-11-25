/**
 * Padrões de cor usados na geração de layout.
 * Alterar estes valores muda o resultado de TODAS as lojas geradas.
 */
export const PALETTE = {
  /** Texto escuro padrão e fallback de cor primária/CTA. */
  ink: "#111827",
  white: "#FFFFFF",
  /** Rodapé quando a primária é clara ou o rodapé extraído coincide com o body. */
  footerDark: "#18181B",
  /** Superfície neutra quando a primária é preta/branca. */
  neutralSurface: "#F4F4F5",
  /** Preço "de" riscado. */
  oldPrice: "#9CA3AF",
  /** Faixa legal do rodapé (fallback só do compiler). */
  legalDark: "#090D16",
  /** Fallback de lightenHex quando a cor não é parseável. */
  lightenFallback: "#F8FAFC",
  /** Sugestão de CTA de conversão (insight). */
  conversionGreen: "#0F766E",
} as const;

/** Proporções de derivação de cores a partir da primária/rodapé. */
export const COLOR_DERIVATION = {
  footerDarken: 0.2,
  neutralLighten: 0.92,
  legalDarken: 0.25,
  defaultDarken: 0.2,
  defaultLighten: 0.88,
} as const;

/** Limiares de luminância/saturação (luminância relativa WCAG, 0–1). */
export const COLOR_THRESHOLDS = {
  /** Acima disto o texto sobre o fundo é escuro (ink); abaixo, branco. */
  foregroundLuminance: 0.42,
  /** isLightColor: acima disto a cor é considerada clara. */
  lightColorLuminance: 0.5,
  /** isNearWhiteOrBlack: saturação máxima e extremos de luminância. */
  nearNeutralSaturation: 0.12,
  nearWhiteLuminance: 0.85,
  nearBlackLuminance: 0.05,
  /** Contraste mínimo WCAG AA para texto. */
  minContrast: 4.5,
} as const;

/**
 * Cinzas fixos do CSS/HTML do storefront gerado (bordas, textos secundários, superfícies de
 * busca, modais e gavetas). Escala gray do Tailwind, em minúsculas para manter o HTML
 * compilado idêntico (golden snapshots). Não dependem do tema da loja.
 */
export const STOREFRONT_GRAYS = {
  /** Fundo sutil: hover de itens, campos de busca, miniaturas. */
  gray50: "#f9fafb",
  /** Botões de fechar, divisórias leves. */
  gray100: "#f3f4f6",
  /** Divisórias de cabeçalho de gaveta/modal. */
  gray200: "#e5e7eb",
  /** Bordas de inputs e cartões. */
  gray300: "#d1d5db",
  /** Texto auxiliar (rótulos, estados vazios). */
  gray500: "#6b7280",
  /** Texto secundário (subtítulos, parcelas). */
  gray600: "#4b5563",
  /** Texto de corpo em superfícies brancas fixas. */
  gray700: "#374151",
  /** Texto principal em superfícies brancas fixas. */
  gray900: "#111827",
} as const;
