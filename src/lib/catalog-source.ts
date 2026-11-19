/** Infere a origem de uma vitrine (módulo Lista de Produtos) pelo título/subtítulo. */
export function inferShowcaseSource(title: string, subtitle?: string): string {
  const text = `${title} ${subtitle ?? ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (/lancamento|novidade|new in|chegou|chegaram|recem/.test(text)) return "Lançamentos";
  if (/mais vendid|best ?seller|top vend|queridinh|favorit|campe/.test(text)) return "Mais Vendidos";
  if (/promo|oferta|sale|desconto|outlet|liquida/.test(text)) return "Promoção";
  return "A definir";
}
