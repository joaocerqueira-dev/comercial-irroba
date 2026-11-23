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
