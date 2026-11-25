import { CONTAINER_WIDTH_PX } from "@/lib/layout-patterns";
import { fontFallback } from "../helpers";
import type { StorefrontContext } from "../context";

/** Variáveis :root do tema LIME, reset e containers. */
export function cssBase(ctx: StorefrontContext): string {
  const {
    primaryBg,
    primaryFg,
    secondaryBg,
    secondaryFg,
    neutralBg,
    neutralFg,
    bodyBg,
    bodyFg,
    btnPrimaryBg,
    btnPrimaryFg,
    btnPrimaryBorder,
    btnSecBg,
    btnSecFg,
    btnSecBorder,
    announcementBg,
    announcementFg,
    headerBg,
    headerFg,
    headingFont,
    bodyFont,
    radiusCss,
    cardBg,
    cardPaddingX,
    buyBg,
    buyFg,
    buyBorder,
    priceColor,
    oldPriceColor,
    footerBg,
    footerFg,
    legalBg,
    legalFg,
    navHoverColor,
    navHoverBg,
  } = ctx;
  return `    :root {
      --primary-background: ${primaryBg};
      --primary-foreground: ${primaryFg};
      --secondary-background: ${secondaryBg};
      --secondary-foreground: ${secondaryFg};
      --neutral-background: ${neutralBg};
      --neutral-foreground: ${neutralFg};
      --body-background: ${bodyBg};
      --body-foreground: ${bodyFg};
      --btn-primary-background: ${btnPrimaryBg};
      --btn-primary-color: ${btnPrimaryFg};
      --btn-primary-border: ${btnPrimaryBorder};
      --btn-secondary-background: ${btnSecBg};
      --btn-secondary-color: ${btnSecFg};
      --btn-secondary-border: ${btnSecBorder};
      --announcement-background: ${announcementBg};
      --announcement-foreground: ${announcementFg};
      --header-background: ${headerBg};
      --header-foreground: ${headerFg};
      --header-link-hover-color: ${navHoverColor};
      --header-link-hover-bg: ${navHoverBg};
      --title-font-family: '${headingFont}', ${fontFallback(headingFont)};
      --text-font-family: '${bodyFont}', ${fontFallback(bodyFont)};
      --irb-radius: ${radiusCss};
      --productGrid-background: ${cardBg};
      --productGrid-information-padding-x: ${cardPaddingX}px;
      --productList-buy-btn-background: ${buyBg};
      --productList-buy-btn-foreground: ${buyFg};
      --productList-buy-btn-border: ${buyBorder};
      --product-price-color: ${priceColor};
      --product-old-price-color: ${oldPriceColor};
      --footer-background: ${footerBg};
      --footer-foreground: ${footerFg};
      --footerLegal-background: ${legalBg};
      --footerLegal-foreground: ${legalFg};
    }

    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: var(--body-background);
      color: var(--body-foreground);
      font-family: var(--text-font-family);
      overflow-x: clip;
      -webkit-font-smoothing: antialiased;
    }
    h1, h2, h3, h4 { font-family: var(--title-font-family); }
    .container { max-width: ${CONTAINER_WIDTH_PX}px; margin: 0 auto; padding: 0 20px; }
    .container-full { width: 100%; padding: 0 24px; }
`;
}
