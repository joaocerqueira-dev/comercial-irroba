// Pacote de exportação para o painel Irroba (checklists, blocos HTML, CSS) e CSV de produtos.
import { inferShowcaseSource } from "@/lib/catalog-source";
import { escapeCssComment, escapeCsvCell, sanitizeCssColor, sanitizeUrl } from "../sanitize";
import { CONTAINER_WIDTH_PX } from "@/lib/layout-patterns";
import type { CompiledExport, StoreBlueprint } from "@/lib/types/blueprint";
import { RADIUS_MAP } from "./helpers";
import { buildEditorialGalleryHtmlBlock, buildEditorialLookbookHtmlBlock } from "./html-blocks";

const HEADER_POSITION_LABELS: Record<StoreBlueprint["visualOverrides"]["header"]["position"], string> = {
  default: "Padrão",
  sticky: "Fixo ao rolar",
  overlay: "Fixo na tela (sobrepõe conteúdo)",
};

export function compileIrrobaExport(bp: StoreBlueprint): CompiledExport {
  const radiusInfo = RADIUS_MAP[bp.theme.radius];
  // Conteúdo HTML reservado exclusivamente para seções editoriais sofisticadas
  // (Banners -> Personalizar Loja > Banners | Benefícios -> Tarja Informativa | Vitrines -> Listas de Produtos)
  const htmlBlocks = [buildEditorialGalleryHtmlBlock(bp), buildEditorialLookbookHtmlBlock(bp)];

  const limeSettings: CompiledExport["limeSettings"] = [
    { section: "Tema Base", field: "Layout Base", value: "LIME (Código 940001)" },
    { section: "Paleta de cores", field: "Cor primária", value: bp.theme.primaryBackground },
    { section: "Paleta de cores", field: "Texto sobre a cor primária", value: bp.theme.primaryForeground },
    { section: "Paleta de cores", field: "Cor secundária", value: bp.theme.secondaryBackground },
    {
      section: "Paleta de cores",
      field: "Texto sobre a cor secundária",
      value: bp.theme.secondaryForeground,
    },
    { section: "Paleta de cores", field: "Cor neutra", value: bp.theme.neutralBackground },
    { section: "Paleta de cores", field: "Texto sobre a cor neutra", value: bp.theme.neutralForeground },
    { section: "Paleta de cores", field: "Fundo padrão", value: bp.theme.bodyBackground },
    { section: "Paleta de cores", field: "Texto sobre o fundo padrão", value: bp.theme.bodyForeground },
    { section: "Fonte", field: "Fonte dos Títulos", value: bp.theme.headingFont },
    { section: "Fonte", field: "Fonte do Corpo", value: bp.theme.bodyFont },
    { section: "Arredondamento", field: "Estilo", value: radiusInfo.label },
    {
      section: "Botões",
      field: "Botão Primário (Fundo / Texto)",
      value: `${bp.theme.btnPrimaryBackground} / ${bp.theme.btnPrimaryColor}`,
    },
    {
      section: "Botões",
      field: "Botão Secundário (Fundo / Texto / Outline)",
      value: `${bp.theme.btnSecondaryBackground} / ${bp.theme.btnSecondaryColor} / ${
        bp.theme.btnSecondaryOutline ? "Outline Sim" : "Sólido"
      }`,
    },
    { section: "Cabeçalho", field: "Estrutura", value: bp.theme.headerLayout.toUpperCase() },
  ];

  const themeVisualChecklist: CompiledExport["themeVisualChecklist"] = [
    {
      section: "Barra de Aviso / Overline (#overlineEditor)",
      controls: [
        { label: "Cor de fundo", value: bp.visualOverrides.announcement.background },
        { label: "Cor do texto", value: bp.visualOverrides.announcement.foreground },
        ...(bp.visualOverrides.announcement.messages && bp.visualOverrides.announcement.messages.length > 1
          ? [
              {
                label: "Mensagens em rotação",
                value: `${bp.visualOverrides.announcement.messages.length} mensagens (${bp.visualOverrides.announcement.intervalSeconds ?? 4}s cada)`,
              },
            ]
          : []),
      ],
    },
    {
      section: "Cabeçalho (#headerEditor)",
      controls: [
        { label: "Posicionamento", value: HEADER_POSITION_LABELS[bp.visualOverrides.header.position] },
        {
          label: "Cor de fundo / texto",
          value: `${bp.visualOverrides.header.background} / ${bp.visualOverrides.header.foreground}`,
        },
        { label: "Opacidade de fundo", value: String(bp.visualOverrides.header.backgroundOpacity) },
        { label: "Desfoque (blur)", value: `${bp.visualOverrides.header.blurPx}px` },
        { label: "Formato texto categorias", value: bp.visualOverrides.header.categoryCase },
        ...(bp.visualOverrides.header.linkHoverColor
          ? [
              {
                label: "Hover dos links",
                value: `${bp.visualOverrides.header.linkHoverColor} (${bp.visualOverrides.header.linkHoverStyle ?? "underline"})`,
              },
            ]
          : []),
      ],
    },
    {
      section: "Banner (#banner_v2Editor)",
      controls: [
        {
          label: "Largura",
          value: bp.visualOverrides.banner.customWidthPx
            ? `${bp.visualOverrides.banner.customWidthPx}px`
            : bp.visualOverrides.banner.width === "full"
              ? "Largura Total"
              : `Padrão do site (${CONTAINER_WIDTH_PX}px)`,
        },
        ...(bp.visualOverrides.banner.heightPx
          ? [{ label: "Altura de exibição", value: `${bp.visualOverrides.banner.heightPx}px` }]
          : []),
      ],
    },
    {
      section: "Tarja Informativa (#bannerTarjaEditor)",
      controls: [
        {
          label: "Cor de fundo",
          value: bp.sections.benefitsBanner?.backgroundColor ?? bp.theme.neutralBackground,
        },
        {
          label: "Cor do texto",
          value: bp.sections.benefitsBanner?.textColor ?? bp.theme.neutralForeground,
        },
      ],
    },
    {
      section: "Lista de Produtos (#productListEditor)",
      controls: [
        {
          label: "Largura da lista",
          value:
            bp.visualOverrides.productCard.listWidth === "full"
              ? "Largura Total"
              : `Padrão do site (${CONTAINER_WIDTH_PX}px)`,
        },
        { label: "Alinhamento do título", value: bp.visualOverrides.productCard.titleAlign },
        { label: "Espaçamento horizontal card", value: `${bp.visualOverrides.productCard.paddingX}px` },
        {
          label: "Botão Comprar (Fundo / Texto)",
          value: `${bp.visualOverrides.productCard.buyBtnBackground} / ${bp.visualOverrides.productCard.buyBtnForeground}`,
        },
      ],
    },
    {
      section: "Rodapé (#footerInformationEditor & #footerLegalEditor)",
      controls: [
        {
          label: "Largura informações",
          value:
            bp.visualOverrides.footer.width === "full"
              ? "Largura Total"
              : `Padrão do site (${CONTAINER_WIDTH_PX}px)`,
        },
        {
          label: "Rodapé (Fundo / Texto)",
          value: `${bp.visualOverrides.footer.background} / ${bp.visualOverrides.footer.foreground}`,
        },
        {
          label: "Faixa legal (Fundo / Texto)",
          value: `${bp.visualOverrides.footer.legalBackground} / ${bp.visualOverrides.footer.legalForeground}`,
        },
      ],
    },
    {
      section: "Descrição do Produto (#pageProductEditor)",
      controls: [
        {
          label: "Orientação da galeria",
          value: bp.visualOverrides.pageProduct.galleryOrientation === "vertical" ? "Vertical" : "Horizontal",
        },
        { label: "Título do botão de compra", value: bp.visualOverrides.pageProduct.buyButtonText },
      ],
    },
  ];

  const bannerModulesChecklist: CompiledExport["bannerModulesChecklist"] = [
    ...(bp.sections.heroSlides ?? [])
      .filter((s) => s.enabled)
      .map((s, idx) => ({
        slotName: `Banner Principal — Slide ${idx + 1}`,
        bannerType: "Carrossel" as const,
        moduleType: "Personalizar Loja > Banners (Banner Versão 2)",
        recommendedSize: "1920×1080 (Desktop) / 900×1500 (Mobile)",
        imageUrl: s.imageUrl,
        notes:
          s.mode === "artwork"
            ? "Tipo: Carrossel. Subir imagem original em 'Lista de banners para desktop' e versão vertical no Mobile."
            : `Tipo: Carrossel. Incluir arte com texto "${s.headline}" e CTA "${s.ctaText}" (Banner V2 não sobrepõe texto nativamente).`,
      })),
    ...(bp.sections.slimBanner?.enabled
      ? [
          {
            slotName: "Banner Slim Promocional (Faixa Horizontal)",
            bannerType: "Grade" as const,
            moduleType: "Personalizar Loja > Banners (Banner Versão 2)",
            recommendedSize: "1920×220 (Desktop) / 900×280 (Mobile)",
            imageUrl: bp.sections.slimBanner.imageUrl || "(Usar arte horizontal da campanha)",
            notes:
              bp.sections.slimBanner.mode === "image" && bp.sections.slimBanner.imageUrl
                ? "Tipo: Grade (1 coluna). Posicionar acima da 1ª Lista de Produtos."
                : `Criar peça horizontal com texto "${bp.sections.slimBanner.headline}" e subir em Personalizar Loja > Banners (Grade 1 coluna).`,
          },
        ]
      : []),
    ...(bp.sections.secondaryBanner?.enabled && bp.sections.secondaryBanner.imageUrl
      ? [
          {
            slotName: "Banner Secundário de Campanha",
            bannerType: "Grade" as const,
            moduleType: "Personalizar Loja > Banners (Banner Versão 2)",
            recommendedSize: "1920×650 (Desktop) / 900×900 (Mobile)",
            imageUrl: bp.sections.secondaryBanner.imageUrl,
            notes:
              bp.sections.secondaryBanner.mode === "artwork"
                ? "Tipo: Grade (1 coluna). Posicionar entre a 1ª e 2ª Lista de Produtos."
                : `Tipo: Grade. Banner de campanha com título "${bp.sections.secondaryBanner.headline}" e link para coleção.`,
          },
        ]
      : []),
  ];

  const benefitsCfg = bp.sections.benefitsBanner;
  const isSiteBenefits = benefitsCfg?.mode === "site-images" && (benefitsCfg.siteImageUrls?.length ?? 0) > 0;

  const tarjaChecklist: CompiledExport["tarjaChecklist"] = {
    moduleName: "Personalizar Loja > Tarja Informativa (Exclusivo Tema LIME)",
    itemLayout: isSiteBenefits ? "Apenas Imagem" : "Horizontal",
    visibleDesktop: isSiteBenefits ? Math.min(6, benefitsCfg.siteImageUrls.length) : 4,
    visibleTablet: 2,
    visibleMobile: 1,
    items: isSiteBenefits
      ? benefitsCfg.siteImageUrls.slice(0, 6).map((url, idx) => ({
          title: `Benefício ${idx + 1}`,
          description: "Arte original extraída do site",
          imageUrl: url,
        }))
      : bp.sections.benefits.slice(0, 4).map((b) => ({
          title: b.title,
          description: b.subtitle,
        })),
    notes: isSiteBenefits
      ? "Selecionar 'Layout do Item: Apenas Imagem' e subir as artes originais na ordem abaixo. Ativar slider no Mobile."
      : "Selecionar 'Layout do Item: Horizontal' e cadastrar os 4 itens (Título + Descrição + ícone PNG). Se preferir faixa única, baixe a arte PNG gerada no Studio e use em 'Banner Versão 2'.",
  };

  const productListsChecklist: CompiledExport["productListsChecklist"] = bp.sections.showcases.map((sc) => ({
    title: sc.title,
    sourceType: inferShowcaseSource(sc.title, sc.subtitle),
    displayMode: "Carrossel" as const,
    desktopItems: 4,
    mobileItems: 1.2,
    titleAlign: bp.visualOverrides.productCard.titleAlign,
    limit: Math.max(8, sc.productIds.length),
  }));

  const customCss = `/* CSS Personalizado — Tema LIME (${escapeCssComment(bp.brand.name)}) */
/* Cole em: Editar tema > Código > CSS Personalizado */
.product.product-grid {
  transition: transform 0.22s ease, box-shadow 0.22s ease;
  border-radius: ${radiusInfo.css};
}
.product.product-grid:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
}
.product-btn {
  font-weight: 600;
  letter-spacing: 0.02em;
  border-radius: ${radiusInfo.css};
  border: 1px solid ${sanitizeCssColor(bp.visualOverrides.productCard.buyBtnBorder, "transparent")};
}
.htmlContent a {
  transition: transform 0.35s ease, opacity 0.25s ease;
}
.htmlContent a:hover img {
  transform: scale(1.04);
}`;

  return {
    limeSettings,
    themeVisualChecklist,
    bannerModulesChecklist,
    tarjaChecklist,
    productListsChecklist,
    htmlBlocks,
    customCss,
  };
}

export function compileProductsCsv(bp: StoreBlueprint): string {
  const header = [
    "Nome",
    "Categoria",
    "Preço",
    "Preço Promocional",
    "URL da Imagem",
    "Parcelamento",
    "Descrição",
  ];
  const rows = bp.products
    .filter((p) => p.visible !== false)
    .map((p) => [
      escapeCsvCell(p.title),
      escapeCsvCell(p.category),
      escapeCsvCell(p.price.toFixed(2).replace(".", ",")),
      escapeCsvCell(p.compareAtPrice ? p.compareAtPrice.toFixed(2).replace(".", ",") : ""),
      escapeCsvCell(sanitizeUrl(p.imageUrl, "")),
      escapeCsvCell(p.installmentsText ?? ""),
      escapeCsvCell(p.description ?? ""),
    ]);
  return "\uFEFF" + [header.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
}
