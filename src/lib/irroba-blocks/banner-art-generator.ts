import { escapeHtml, sanitizeCssColor, sanitizeFontName } from "./sanitize";
import type { StoreBlueprint } from "@/lib/types/blueprint";

function benefitVectorPath(icon: string, strokeColor: string): string {
  switch (icon) {
    case "truck":
      return `<g fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
        <path d="M15 18H9"/>
        <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
        <circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>
      </g>`;
    case "credit-card":
      return `<g fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
      </g>`;
    case "shield-check":
      return `<g fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
        <path d="m9 12 2 2 4-4"/>
      </g>`;
    default:
      return `<g fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
      </g>`;
  }
}

/**
 * Generates a real graphic SVG banner artwork for the storefront benefits strip.
 * Used both as a crisp visual banner in the preview and downloadable as PNG/SVG for Irroba upload.
 */
export function generateBenefitsBannerSvgString(bp: StoreBlueprint): string {
  const bg = sanitizeCssColor(bp.sections.benefitsBanner?.backgroundColor ?? bp.theme.neutralBackground, "#F4F4F5");
  const fg = sanitizeCssColor(bp.sections.benefitsBanner?.textColor ?? bp.theme.neutralForeground, "#111827");
  const accent = sanitizeCssColor(bp.theme.primaryBackground, "#111827");
  const accentFg = sanitizeCssColor(bp.theme.primaryForeground, "#FFFFFF");
  const font = sanitizeFontName(bp.theme.bodyFont, "Poppins");

  const items = bp.sections.benefits.slice(0, 4);
  const count = Math.max(1, items.length);
  const width = 1280;
  const height = 164;
  const colW = width / count;

  const colsSvg = items
    .map((item, idx) => {
      const x = Math.round(idx * colW);
      const cy = height / 2;
      const rawTitle = item.title.trim().toUpperCase();
      const rawSubtitle = item.subtitle.trim();
      const title = escapeHtml(rawTitle.length > 22 ? `${rawTitle.slice(0, 21)}…` : rawTitle);
      const subtitle = escapeHtml(
        rawSubtitle.length > 34 ? `${rawSubtitle.slice(0, 33)}…` : rawSubtitle
      );

      return `<g transform="translate(${x}, 0)">
        <rect x="16" y="24" width="${colW - 32}" height="${height - 48}" rx="12" fill="#FFFFFF" fill-opacity="0.72" stroke="${fg}" stroke-opacity="0.08"/>
        <circle cx="52" cy="${cy}" r="22" fill="${accent}"/>
        <g transform="translate(40, ${cy - 12})">
          ${benefitVectorPath(item.icon, accentFg)}
        </g>
        <text x="86" y="${cy - 6}" font-family="${escapeHtml(font)}, Arial, sans-serif" font-size="13.5" font-weight="800" letter-spacing="0.4" fill="${fg}">${title}</text>
        <text x="86" y="${cy + 15}" font-family="${escapeHtml(font)}, Arial, sans-serif" font-size="11.5" font-weight="500" fill="${fg}" fill-opacity="0.74">${subtitle}</text>
      </g>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Benefícios ${escapeHtml(bp.brand.name)}">
  <rect width="${width}" height="${height}" fill="${bg}"/>
  ${colsSvg}
</svg>`;
}

export function generateBenefitsBannerDataUri(bp: StoreBlueprint): string {
  const svg = generateBenefitsBannerSvgString(bp);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
