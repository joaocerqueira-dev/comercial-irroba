import { escapeHtml } from "@/lib/irroba-blocks/sanitize";
import type { CustomSection, CustomSectionKind, StoreBlueprint } from "@/lib/types/blueprint";

/** Id único de seção personalizada (não depende de crypto.randomUUID, ausente fora de HTTPS). */
export function newCustomSectionId(kind: CustomSectionKind): string {
  return `custom-${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

/** Seção personalizada nova, já preenchida com cores, textos e imagens da própria loja. */
export function createCustomSection(kind: CustomSectionKind, refBp: StoreBlueprint): CustomSection {
  const id = newCustomSectionId(kind);
  const fallbackImg =
    refBp.sections.heroSlides[0]?.imageUrl ||
    refBp.sections.hero.imageUrl ||
    refBp.sections.secondaryBanner?.imageUrl ||
    refBp.products[0]?.imageUrl ||
    "";

  switch (kind) {
    case "html":
      return {
        id,
        kind: "html",
        title: "Bloco HTML Personalizado",
        width: "container",
        html: `<div style="padding:36px 20px;border-radius:12px;background:${refBp.theme.neutralBackground};color:${refBp.theme.neutralForeground};text-align:center;">
<h2 style="margin:0 0 10px;font-size:24px;">Destaque ${escapeHtml(refBp.brand.name)}</h2>
<p style="margin:0 auto 18px;max-width:620px;font-size:15px;opacity:.88;">Edite este conteúdo manualmente ou gere um novo layout com auxílio da IA usando a identidade da marca.</p>
<a href="#vitrines" style="display:inline-block;padding:11px 22px;border-radius:6px;background:${refBp.theme.btnPrimaryBackground};color:${refBp.theme.btnPrimaryColor};text-decoration:none;font-weight:700;font-size:13px;">Explorar Produtos</a>
</div>`,
      };
    case "banner":
      return {
        id,
        kind: "banner",
        title: "Banner de Campanha",
        mode: "editorial",
        imageUrl: fallbackImg,
        headline: "Nova Campanha em Destaque",
        subheadline: "Curadoria selecionada com envio rápido para todo o Brasil.",
        ctaText: "Conferir Coleção",
        ctaHref: "#vitrines",
      };
    case "slimBanner":
      return {
        id,
        kind: "slimBanner",
        title: "Banner Slim Promocional",
        mode: "designed",
        imageUrl: "",
        badgeText: "DESTAQUE",
        headline: "Condições especiais com desconto no PIX e parcelamento sem juros",
        ctaText: "Aproveitar",
        backgroundColor: refBp.theme.primaryBackground,
        textColor: refBp.theme.primaryForeground,
      };
    case "showcase":
      return {
        id,
        kind: "showcase",
        title: "Vitrine Personalizada",
        subtitle: "Seleção especial da coleção",
        categoryFilter: refBp.sections.categories[0]?.label || "",
        productIds: refBp.products.slice(0, 8).map((p) => p.id),
        limit: 8,
      };
    case "gallery": {
      const seededItems =
        refBp.sections.moodBanners.length > 0
          ? refBp.sections.moodBanners.slice(0, 3)
          : refBp.products.slice(0, 3).map((p, idx) => ({
              id: `gal-${idx + 1}`,
              title: p.category || p.title,
              subtitle: "Ver coleção",
              imageUrl: p.imageUrl,
              href: "#vitrines",
              enabled: true,
            }));
      return {
        id,
        kind: "gallery",
        title: "Galeria de Destaques",
        subtitle: "Navegue pelos estilos da coleção",
        columns: 3,
        items: seededItems,
      };
    }
    case "tarja":
      return {
        id,
        kind: "tarja",
        title: "Tarja de Benefícios Adicional",
        items: [
          { icon: "truck", title: "Envio Rápido", subtitle: "Despacho em até 24h úteis" },
          { icon: "credit-card", title: "Parcelamento Facilitado", subtitle: "Em até 6x sem juros" },
          { icon: "shield-check", title: "Compra Garantida", subtitle: "Ambiente 100% protegido" },
        ],
      };
    case "editorialSplit":
      return {
        id,
        kind: "editorialSplit",
        title: "Editorial Marca",
        eyebrow: "SOBRE A MARCA",
        headline: `Essência ${refBp.brand.name}`,
        description:
          refBp.footer.aboutText ||
          "Qualidade, acabamento impecável e curadoria pensada nos mínimos detalhes.",
        ctaText: "Ver Coleção",
        ctaHref: "#vitrines",
        imageUrl: refBp.sections.lookbook?.mainImageUrl || fallbackImg,
        imageSide: "left",
      };
  }
}
