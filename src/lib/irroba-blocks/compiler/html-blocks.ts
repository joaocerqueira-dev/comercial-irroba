// Blocos "Conteúdo HTML" editoriais exportados para o Irroba (galeria e lookbook).
import { escapeAttr, escapeHtml, sanitizeCssColor, sanitizeFontName, sanitizeUrl } from "../sanitize";
import { CONTAINER_WIDTH_PX, FONT_FALLBACKS, PALETTE } from "@/lib/layout-patterns";
import type { HtmlBlockExport, StoreBlueprint } from "@/lib/types/blueprint";
import { RADIUS_MAP, splitHeadlineForItalicAccent, fontFallback, cleanAltText } from "./helpers";

export function buildEditorialGalleryHtmlBlock(bp: StoreBlueprint): HtmlBlockExport {
  const radius = RADIUS_MAP[bp.theme.radius].css;
  const bodyBg = sanitizeCssColor(bp.theme.bodyBackground, PALETTE.white);
  const bodyColor = sanitizeCssColor(bp.theme.bodyForeground, PALETTE.ink);
  const primaryBg = sanitizeCssColor(bp.theme.primaryBackground, PALETTE.ink);
  const headingFont = sanitizeFontName(bp.theme.headingFont, FONT_FALLBACKS.heading);
  const activeMoods = (bp.sections.moodBanners ?? []).filter((m) => m.enabled);
  const visibleProducts = bp.products.filter((p) => p.visible !== false);

  const fallbackImgs = [...visibleProducts.map((p) => p.imageUrl), bp.sections.hero.imageUrl].filter(Boolean);

  const rawItems =
    activeMoods.length > 0
      ? activeMoods
      : bp.sections.categories.slice(0, 4).map((c, idx) => ({
          id: `cat-mood-${idx}`,
          title: c.label,
          subtitle: "Curadoria",
          imageUrl: c.imageUrl || fallbackImgs[idx % Math.max(1, fallbackImgs.length)] || "",
          href: c.href,
          enabled: true,
        }));

  const items = rawItems.slice(0, 4);
  const totalStr = String(items.length).padStart(2, "0");
  const { lead, accent } = splitHeadlineForItalicAccent(
    bp.sections.moodSectionTitle || "Explore por Coleção"
  );

  const cardsHtml = items
    .map((item, idx) => {
      const title = escapeHtml(item.title);
      const subtitle = escapeHtml(item.subtitle || "Curadoria Exclusiva");
      const imgUrl = sanitizeUrl(
        item.imageUrl || fallbackImgs[idx % Math.max(1, fallbackImgs.length)] || "",
        ""
      );
      const href = escapeAttr(sanitizeUrl(item.href, "#vitrines"));
      const indexStr = String(idx + 1).padStart(2, "0");

      const mediaMarkup = imgUrl
        ? `<img src="${escapeAttr(imgUrl)}" alt="${escapeAttr(cleanAltText(item.title))}" referrerpolicy="no-referrer" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;transition:transform 0.55s ease;" />`
        : `<div style="position:absolute;inset:0;background:linear-gradient(135deg,${primaryBg},#18181b);"></div>`;

      const moodCardSizeCss = bp.sections.moodCardHeightPx
        ? `height:${Math.min(900, Math.max(180, Math.round(bp.sections.moodCardHeightPx)))}px;min-height:${Math.min(900, Math.max(180, Math.round(bp.sections.moodCardHeightPx)))}px;`
        : "aspect-ratio:3/4;min-height:340px;";

      return `<a href="${href}" data-irb-cat="${escapeAttr(item.title)}" style="position:relative;flex:1 0 min(260px,74vw);scroll-snap-align:start;${moodCardSizeCss}border-radius:${radius};overflow:hidden;display:block;text-decoration:none;background:#141416;color:#ffffff;box-sizing:border-box;">
    ${mediaMarkup}
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0.52) 0%,rgba(0,0,0,0.16) 24%,rgba(0,0,0,0.03) 48%,rgba(0,0,0,0.82) 100%);"></div>
    <div style="position:absolute;top:18px;left:18px;right:18px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
      <span style="font-size:10px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.92);padding:5px 10px;border:1px solid rgba(255,255,255,0.3);border-radius:999px;background:rgba(0,0,0,0.22);">${indexStr} / ${totalStr}</span>
      <span style="font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.92);background:rgba(0,0,0,0.3);padding:4px 9px;border-radius:999px;">${subtitle}</span>
    </div>
    <div style="position:absolute;left:22px;right:22px;bottom:22px;color:#ffffff;">
      <div style="font-family:'${headingFont}',${fontFallback(headingFont)};font-size:clamp(21px,2.1vw,27px);font-weight:400;line-height:1.1;letter-spacing:-0.01em;margin:0 0 12px 0;">${title}</div>
      <span style="display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#ffffff;padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.7);">Explorar &#8594;</span>
    </div>
  </a>`;
    })
    .join("\n      ");

  const html = `<div style="position:relative;left:50%;width:100vw;max-width:100vw;margin-left:-50vw;background:${bodyBg};color:${bodyColor};padding:clamp(46px,6vw,78px) clamp(20px,4vw,52px);box-sizing:border-box;">
  <div style="max-width:${CONTAINER_WIDTH_PX}px;margin:0 auto;">
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:clamp(28px,3.8vw,44px);">
      <div style="flex:1 1 380px;">
        <div style="display:inline-flex;align-items:center;gap:10px;font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;opacity:0.68;margin-bottom:12px;">
          <span style="display:inline-block;width:28px;height:1px;background:${primaryBg};"></span>
          <span>Curadoria · ${escapeHtml(bp.brand.niche)}</span>
        </div>
        <h2 style="margin:0;font-family:'${headingFont}',${fontFallback(headingFont)};font-size:clamp(30px,4vw,50px);font-weight:300;line-height:1.02;letter-spacing:-0.02em;color:${bodyColor};">${escapeHtml(lead)} <em style="font-style:italic;font-weight:400;color:${primaryBg};">${escapeHtml(accent)}</em></h2>
      </div>
      <div style="flex:0 1 340px;">
        <p style="margin:0 0 14px 0;font-size:14px;line-height:1.65;opacity:0.78;">Seleção editorial pensada para destacar as principais linhas da ${escapeHtml(bp.brand.name)} com navegação fluida em qualquer tela.</p>
        <a href="#categoria" data-irb-cat="all" style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${bodyColor};text-decoration:none;padding-bottom:4px;border-bottom:1px solid ${bodyColor};">Ver catálogo completo &#8594;</a>
      </div>
    </div>
    <div style="display:flex;gap:clamp(14px,1.8vw,22px);overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:8px;scrollbar-width:thin;">
      ${cardsHtml}
    </div>
  </div>
</div>`;

  return {
    id: "irb-html-editorial-gallery",
    name: "Galeria Editorial de Coleções (3:4 + Movimento Suave)",
    moduleTitle: "Conteúdo HTML · Galeria Editorial",
    recommendedWidth: "Largura Total",
    placementNote:
      "Posicionar em Página Inicial > Topo do Conteúdo logo após a Tarja Informativa. Usa 100% CSS inline + animação SVG SMIL nativa sem JavaScript (compatível com SunEditor).",
    html,
  };
}

export function buildEditorialLookbookHtmlBlock(bp: StoreBlueprint): HtmlBlockExport {
  const neutralBg = sanitizeCssColor(bp.theme.neutralBackground, PALETTE.neutralSurface);
  const neutralFg = sanitizeCssColor(bp.theme.neutralForeground, PALETTE.ink);
  const secondaryBg = sanitizeCssColor(bp.theme.secondaryBackground, PALETTE.footerDark);
  const secondaryFg = sanitizeCssColor(bp.theme.secondaryForeground, PALETTE.white);
  const primaryBg = sanitizeCssColor(bp.theme.primaryBackground, PALETTE.ink);
  const btnBg = sanitizeCssColor(bp.theme.btnPrimaryBackground, PALETTE.ink);
  const btnFg = sanitizeCssColor(bp.theme.btnPrimaryColor, PALETTE.white);
  const btnBorder = sanitizeCssColor(
    bp.theme.btnPrimaryBorder === "transparent" && btnBg.toUpperCase() === secondaryBg.toUpperCase()
      ? secondaryFg
      : bp.theme.btnPrimaryBorder,
    "transparent"
  );
  const headingFont = sanitizeFontName(bp.theme.headingFont, FONT_FALLBACKS.heading);
  const radius = RADIUS_MAP[bp.theme.radius].css;

  const visibleProducts = bp.products.filter((p) => p.visible !== false);
  const lookbook = bp.sections.lookbook;
  const mainPhoto = sanitizeUrl(
    lookbook?.mainImageUrl ||
      bp.sections.secondaryBanner?.imageUrl ||
      bp.sections.moodBanners?.[0]?.imageUrl ||
      visibleProducts[0]?.imageUrl ||
      bp.sections.hero.imageUrl,
    ""
  );
  const detailProduct = visibleProducts[1] ?? visibleProducts[0];
  const insetPhoto = sanitizeUrl(
    lookbook?.insetImageUrl || detailProduct?.imageUrl || bp.sections.hero.imageUrl,
    ""
  );

  const pillars = bp.sections.benefits
    .slice(0, 3)
    .map((b) => b.title.trim())
    .filter(Boolean)
    .join("  ·  ");

  const { lead, accent } = splitHeadlineForItalicAccent(
    lookbook?.headline || bp.sections.promoStripText || `A essência da ${bp.brand.name}`
  );
  const lookbookEyebrow = lookbook?.eyebrow || "01 / Manifesto";
  const lookbookDesc = lookbook?.description || bp.footer.aboutText;
  const lookbookCta = lookbook?.ctaText || bp.sections.hero.ctaText || "Explorar Coleção";

  const insetThumbHtml = insetPhoto
    ? `<div ${detailProduct ? `data-open-pdp="${escapeAttr(detailProduct.id)}"` : ""} style="position:absolute;right:-10px;bottom:-18px;width:clamp(108px,14vw,156px);aspect-ratio:1/1;border-radius:${radius};overflow:hidden;border:4px solid ${neutralBg};box-shadow:0 18px 36px rgba(0,0,0,0.16);background:#ffffff;cursor:pointer;">
          <img src="${escapeAttr(insetPhoto)}" alt="${escapeAttr(detailProduct?.title || bp.brand.name)}" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;display:block;" />
        </div>`
    : "";

  const html = `<div style="position:relative;left:50%;width:100vw;max-width:100vw;margin-left:-50vw;background:${neutralBg};color:${neutralFg};padding:clamp(48px,7vw,88px) clamp(20px,4vw,52px) 0;box-sizing:border-box;">
  <div style="max-width:${CONTAINER_WIDTH_PX}px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;gap:clamp(32px,5vw,68px);padding-bottom:clamp(54px,7vw,84px);">
    <div style="flex:1.25 1 360px;position:relative;">
      <div style="position:relative;aspect-ratio:10/7;border-radius:${radius};overflow:hidden;background:#18181b;">
        ${
          mainPhoto
            ? `<img src="${escapeAttr(mainPhoto)}" alt="Editorial ${escapeAttr(bp.brand.name)}" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;display:block;" />`
            : ""
        }
        <span style="position:absolute;top:16px;left:16px;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#ffffff;background:rgba(0,0,0,0.45);padding:6px 12px;border-radius:999px;">Lookbook · ${escapeHtml(bp.brand.name)}</span>
      </div>
      ${insetThumbHtml}
    </div>
    <div style="flex:1 1 320px;">
      <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;padding-bottom:14px;border-bottom:1px solid rgba(0,0,0,0.14);opacity:0.76;">
        <span>${escapeHtml(lookbookEyebrow)}</span>
        <span>${escapeHtml(bp.brand.niche)}</span>
      </div>
      <h2 style="margin:22px 0 16px 0;font-family:'${headingFont}',${fontFallback(headingFont)};font-size:clamp(28px,3.6vw,46px);font-weight:300;line-height:1.05;letter-spacing:-0.02em;color:${neutralFg};">${escapeHtml(lead)} <em style="font-style:italic;font-weight:400;color:${primaryBg};">${escapeHtml(accent)}</em></h2>
      ${
        pillars
          ? `<div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;opacity:0.65;margin-bottom:18px;">${escapeHtml(pillars)}</div>`
          : ""
      }
      <p style="margin:0 0 28px 0;font-size:15px;line-height:1.75;opacity:0.86;">${escapeHtml(lookbookDesc)}</p>
      <a href="#vitrines" style="display:inline-flex;align-items:center;gap:10px;padding:13px 26px;border:1px solid ${neutralFg};color:${neutralFg};background:transparent;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;border-radius:${radius};">${escapeHtml(lookbookCta)} &#8594;</a>
    </div>
  </div>
  <div style="margin:0 calc(-1 * clamp(20px,4vw,52px));background:${secondaryBg};color:${secondaryFg};padding:clamp(34px,4.5vw,54px) clamp(20px,4vw,52px);box-sizing:border-box;">
    <div style="max-width:${CONTAINER_WIDTH_PX}px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:22px;">
      <div style="flex:1 1 440px;">
        <div style="font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;opacity:0.72;margin-bottom:8px;">Experiência ${escapeHtml(bp.brand.name)}</div>
        <div style="font-family:'${headingFont}',${fontFallback(headingFont)};font-size:clamp(20px,2.4vw,28px);font-weight:400;line-height:1.25;color:${secondaryFg};">${escapeHtml(bp.sections.announcementText || bp.sections.promoStripText)}</div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:12px;">
        <a href="#vitrines" style="display:inline-block;padding:13px 26px;background:${btnBg};color:${btnFg};border:1px solid ${btnBorder};text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;border-radius:${radius};">Comprar Agora</a>
        <a href="#categoria" data-irb-cat="all" style="display:inline-block;padding:13px 26px;background:transparent;color:${secondaryFg};border:1px solid ${secondaryFg};text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;border-radius:${radius};">Ver Tudo</a>
      </div>
    </div>
  </div>
</div>`;

  return {
    id: "irb-html-editorial-lookbook",
    name: "Lookbook Split + Faixa Manifesto da Marca",
    moduleTitle: "Conteúdo HTML · Lookbook & Manifesto",
    recommendedWidth: "Largura Total",
    placementNote:
      "Posicionar entre a 1ª e 2ª Lista de Produtos ou antes das Avaliações. Eleva o posicionamento da marca com composição editorial 10:7 + detalhe 1:1 e fechamento contrastado.",
    html,
  };
}
