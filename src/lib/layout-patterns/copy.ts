/** Textos padrão inseridos quando a loja não fornece conteúdo equivalente. */
export const DEFAULT_COPY = {
  productCategory: "Destaques",
  installments: (price: number, n: number) =>
    `em até ${n}x de R$ ${(price / n).toFixed(2).replace(".", ",")} sem juros`,
  announcement: "Frete Grátis em compras selecionadas • 5% OFF no PIX • Parcele em até 6x sem juros",
  heroCta: "Ver Coleção",
  /** Selo único da faixa promocional (schema, heurística e compiler). */
  slimBadge: "OFERTA ESPECIAL",
  slimCtaImage: "Conferir",
  slimCtaDesigned: "Aproveitar Agora",
  moodSectionTitle: "Explore por Estilo & Categoria",
  showcase1Title: "Destaques da Coleção",
  showcase1Subtitle: "Os favoritos dos nossos clientes com entrega para todo o Brasil",
  showcase2Title: "Mais Procurados & Novidades",
  showcase2Subtitle: "Seleção especial com pagamento facilitado no PIX e cartão",
  testimonialsTitle: "Quem compra recomenda",
  buyButton: "Comprar agora",
  benefits: [
    { icon: "truck", title: "Envio Rápido", subtitle: "Para todo o Brasil com rastreio" },
    { icon: "credit-card", title: "Até 6x Sem Juros", subtitle: "Ou desconto especial no PIX" },
    { icon: "shield-check", title: "Compra 100% Segura", subtitle: "Checkout transparente protegido" },
    { icon: "refresh-cw", title: "Troca Facilitada", subtitle: "Primeira troca simples e rápida" },
  ],
} as const;

/** Regex usadas para reaproveitar títulos de seção da loja original. */
export const SECTION_HEADING_PATTERNS = {
  showcase1: /destaqu|preferid|best|mais vendid|cole/i,
  showcase2: /lançament|novidad|ofert|promo/i,
  mood: /mood|estilo|categoria|cole/i,
  testimonials: /dissemos|dizem|avalia|depoiment|cliente/i,
} as const;

/** Imagens de placeholder (Unsplash) quando a loja não tem imagens. */
export const PLACEHOLDER_IMAGES = {
  product: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
  hero: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1400&q=80",
} as const;
