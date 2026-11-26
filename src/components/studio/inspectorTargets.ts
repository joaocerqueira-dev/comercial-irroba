import type { SectionKey } from "@/lib/types/blueprint";

export type InspectorTargetId =
  | SectionKey
  | "custom-section"
  | "announcement"
  | "header"
  | "header-logo"
  | "header-nav"
  | "product-item"
  | "buy-button"
  | "footer"
  | "footer-legal"
  | "pdp";

export interface InspectorSelection {
  targetId: InspectorTargetId;
  label?: string;
  productId?: string;
  showcaseIdx?: number;
  subIndex?: number;
  customSectionId?: string;
}

export interface InspectorMeta {
  id: InspectorTargetId;
  title: string;
  irrobaRef: string;
  sectionKey?: SectionKey;
}

export const INSPECTOR_META: Record<InspectorTargetId, InspectorMeta> = {
  announcement: {
    id: "announcement",
    title: "Barra de Aviso (Overline)",
    irrobaRef: "Topo · #overlineEditor",
  },
  header: {
    id: "header",
    title: "Cabeçalho",
    irrobaRef: "Tema LIME · #headerEditor",
  },
  "header-logo": {
    id: "header-logo",
    title: "Logotipo da Loja",
    irrobaRef: "Cabeçalho · Identidade",
  },
  "header-nav": {
    id: "header-nav",
    title: "Menu de Categorias",
    irrobaRef: "Cabeçalho · Navegação",
  },
  hero: {
    id: "hero",
    title: "Banner Principal",
    irrobaRef: "Banner Versão 2 · #banner_v2Editor",
    sectionKey: "hero",
  },
  tarja: {
    id: "tarja",
    title: "Tarja Informativa",
    irrobaRef: "Benefícios · #bannerTarjaEditor",
    sectionKey: "tarja",
  },
  editorialGallery: {
    id: "editorialGallery",
    title: "Galeria Editorial",
    irrobaRef: "Conteúdo HTML · Mosaico 3:4",
    sectionKey: "editorialGallery",
  },
  slimBanner: {
    id: "slimBanner",
    title: "Banner Slim Promocional",
    irrobaRef: "Banner Versão 2 · Faixa",
    sectionKey: "slimBanner",
  },
  showcase1: {
    id: "showcase1",
    title: "Vitrine Principal",
    irrobaRef: "Listas de Produtos · #productListEditor",
    sectionKey: "showcase1",
  },
  extraShowcases: {
    id: "extraShowcases",
    title: "Vitrines Adicionais",
    irrobaRef: "Listas de Produtos · #productListEditor",
    sectionKey: "extraShowcases",
  },
  "product-item": {
    id: "product-item",
    title: "Card de Produto",
    irrobaRef: "Catálogo & Lista de Produtos",
  },
  "buy-button": {
    id: "buy-button",
    title: "Botão Comprar",
    irrobaRef: "Cards & PDP · #productListEditor",
  },
  secondaryBanner: {
    id: "secondaryBanner",
    title: "Banner Secundário",
    irrobaRef: "Banner Versão 2 · Campanha",
    sectionKey: "secondaryBanner",
  },
  editorialLookbook: {
    id: "editorialLookbook",
    title: "Lookbook & Manifesto",
    irrobaRef: "Conteúdo HTML · Editorial",
    sectionKey: "editorialLookbook",
  },
  testimonials: {
    id: "testimonials",
    title: "Avaliações de Clientes",
    irrobaRef: "Módulo de Avaliações",
    sectionKey: "testimonials",
  },
  newsletter: {
    id: "newsletter",
    title: "Newsletter",
    irrobaRef: "Captura de E-mails",
    sectionKey: "newsletter",
  },
  footer: {
    id: "footer",
    title: "Rodapé — Informações",
    irrobaRef: "Rodapé · #footerInformationEditor",
  },
  "footer-legal": {
    id: "footer-legal",
    title: "Rodapé — Faixa Legal",
    irrobaRef: "Direitos & CNPJ · #footerLegalEditor",
  },
  pdp: {
    id: "pdp",
    title: "Página de Produto (PDP)",
    irrobaRef: "Descrição do Produto · #pageProductEditor",
  },
  "custom-section": {
    id: "custom-section",
    title: "Seção Personalizada",
    irrobaRef: "Construtor Dinâmico · HomePage",
  },
};
