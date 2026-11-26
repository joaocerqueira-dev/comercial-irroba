/**
 * Fonte única das cores do design system do app (BrandBook Irroba 2026).
 *
 * Daqui derivam:
 * - as CSS vars em `:root` (injetadas pelo plugin em `tailwind.config.ts` via `addBase`);
 * - as cores do Tailwind (`brand-*`, `irroba-*`), que apontam para essas vars.
 *
 * Armadilha do Tailwind v3: para os modificadores de opacidade (`bg-brand-50/50`,
 * `ring-brand-500/15`...) funcionarem, a var precisa guardar canais RGB ("234 25 31")
 * e a cor no config precisa ser `rgb(var(--x) / <alpha-value>)`. Com hex dentro da var o
 * Tailwind não consegue aplicar alpha. Em CSS puro, use `rgb(var(--x))`.
 *
 * Teste: src/lib/__tests__/design-tokens-tailwind.test.ts.
 *
 * Não confundir com `src/lib/layout-patterns/palette.ts`, que guarda os padrões de cor
 * das lojas geradas (storefront), e não do app.
 */

/** Escala da marca. 500 = vermelho institucional; 200/600–900 = tonalidades de apoio oficiais. */
export const BRAND_SCALE = {
  50: "#FEF2F2",
  100: "#FDE8E9",
  200: "#F6A0A2",
  300: "#F26B6F",
  400: "#EE3E43",
  500: "#EA191F",
  600: "#CC0E11",
  700: "#AE0203",
  800: "#980101",
  900: "#830000",
  950: "#520000",
} as const;

/** Cores nomeadas da marca: nome Tailwind (`irroba-<nome>`) → nome da CSS var e valor. */
export const IRROBA_COLORS = {
  primary: { cssVar: "--irroba-red", hex: BRAND_SCALE[500] },
  soft: { cssVar: "--irroba-red-soft", hex: BRAND_SCALE[200] },
  mid: { cssVar: "--irroba-red-mid", hex: BRAND_SCALE[600] },
  deep: { cssVar: "--irroba-red-deep", hex: BRAND_SCALE[700] },
  crimson: { cssVar: "--irroba-red-crimson", hex: BRAND_SCALE[800] },
  maroon: { cssVar: "--irroba-red-maroon", hex: BRAND_SCALE[900] },
  surface: { cssVar: "--irroba-surface", hex: "#F7F7F8" },
  ink: { cssVar: "--irroba-ink", hex: "#1F1F23" },
} as const;

/** "#EA191F" → "234 25 31" (formato exigido por `rgb(var(--x) / <alpha-value>)`). */
export function hexToRgbChannels(hex: string): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new Error(`design-tokens: hex inválido "${hex}"`);
  return m
    .slice(1)
    .map((h) => parseInt(h, 16))
    .join(" ");
}

function rgbVar(cssVar: string): string {
  return `rgb(var(${cssVar}) / <alpha-value>)`;
}

/** CSS vars de `:root`, todas em canais RGB. */
export const CSS_VARS: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(BRAND_SCALE).map(([tone, hex]) => [`--brand-${tone}`, hexToRgbChannels(hex)]),
  ),
  ...Object.fromEntries(
    Object.values(IRROBA_COLORS).map(({ cssVar, hex }) => [cssVar, hexToRgbChannels(hex)]),
  ),
};

/** Cores para `theme.extend.colors` do Tailwind. */
export const TAILWIND_COLORS = {
  brand: Object.fromEntries(
    Object.keys(BRAND_SCALE).map((tone) => [tone, rgbVar(`--brand-${tone}`)]),
  ),
  irroba: Object.fromEntries(
    Object.entries(IRROBA_COLORS).map(([name, { cssVar }]) => [name, rgbVar(cssVar)]),
  ),
};
