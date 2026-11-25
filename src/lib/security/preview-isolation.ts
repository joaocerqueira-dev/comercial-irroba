/**
 * Isolamento do HTML gerado (vitrine compilada) que o app embute em iframes.
 *
 * Sem `allow-same-origin`: o documento ganha origem opaca ("null"), não lê o DOM, cookies nem
 * storage do app e só conversa com o pai por postMessage (checado por `source`, não por origem).
 *
 * - `allow-scripts`: o runtime da vitrine (carrinho, carrossel, inspetor do Studio) é JS.
 * - `allow-forms`: sem ela o navegador nem dispara o evento `submit`, e os formulários demo
 *   (busca, CEP, newsletter, conta) dependem dele. Todos fazem `preventDefault`; no /render a CSP
 *   ainda tem `form-action 'none'`, então nada é enviado de fato.
 * - `allow-popups` + `allow-popups-to-escape-sandbox`: links `target="_blank"` (Instagram, sites
 *   externos) abrem em nova aba como uma página normal; sem o escape a aba herdaria o sandbox e
 *   o site de destino quebraria (sem cookies/storage). A aba nova não ganha acesso ao app.
 * - Fora de propósito: `allow-top-navigation` (o conteúdo não pode trocar a página do app) e
 *   `allow-modals` (o runtime não usa alert/confirm).
 */
export const PREVIEW_SANDBOX_FLAGS = [
  "allow-scripts",
  "allow-forms",
  "allow-popups",
  "allow-popups-to-escape-sandbox",
] as const;

/** Valor do atributo `sandbox` dos iframes de prévia. */
export const PREVIEW_IFRAME_SANDBOX = PREVIEW_SANDBOX_FLAGS.join(" ");

/**
 * CSP do documento servido em /render/[slug]. Inclui a diretiva `sandbox`, que dá origem opaca
 * ao documento mesmo quando ele é aberto direto (fora de iframe).
 *
 * `img-src` tem `'self'` porque as imagens espelhadas vêm de /api/captures no host do app;
 * `blob:`/`data:` cobrem imagens inline. Fontes vêm do Google Fonts.
 */
export const RENDER_CSP = [
  "default-src 'none'",
  "img-src 'self' https: data: blob:",
  "style-src 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "script-src 'unsafe-inline'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'self'",
  `sandbox ${PREVIEW_SANDBOX_FLAGS.join(" ")}`,
].join("; ");
