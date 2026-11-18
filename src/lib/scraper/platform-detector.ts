/**
 * Detects the current e-commerce platform from HTML markers and response headers.
 */

export function detectPlatform(html: string, headers: Record<string, string> = {}): string {
  const lower = html.toLowerCase();
  const server = (headers["server"] ?? "").toLowerCase();
  const poweredBy = (headers["x-powered-by"] ?? "").toLowerCase();

  if (
    lower.includes("nuvemshop") ||
    lower.includes("tiendanube") ||
    lower.includes("mitiendanube.com") ||
    lower.includes("d26lpennugtm8s.cloudfront.net") ||
    lower.includes("ls.nube")
  ) {
    return "Nuvemshop";
  }

  if (
    lower.includes("tray.com.br") ||
    lower.includes("tcdn.com.br") ||
    lower.includes("traycorp") ||
    lower.includes("data-tray")
  ) {
    return "Tray";
  }

  if (
    lower.includes("lojaintegrada.com.br") ||
    lower.includes("awsli.com.br") ||
    lower.includes("cdn.awsli.com.br")
  ) {
    return "Loja Integrada";
  }

  if (
    lower.includes("cdn.shopify.com") ||
    lower.includes("shopify.theme") ||
    headers["x-shopid"] !== undefined
  ) {
    return "Shopify";
  }

  if (
    lower.includes("woocommerce") ||
    lower.includes("wp-content/plugins/woocommerce") ||
    lower.includes("wc-ajax")
  ) {
    return "WooCommerce";
  }

  if (
    lower.includes("vtexassets.com") ||
    lower.includes("vteximg.com.br") ||
    lower.includes("vtex.com") ||
    poweredBy.includes("vtex")
  ) {
    return "VTEX";
  }

  if (lower.includes("bagy.com.br") || lower.includes("dooca.com.br")) {
    return "Bagy / Dooca";
  }

  if (lower.includes("irroba.com.br") || lower.includes("theme-_lime") || lower.includes("default_new/stylesheet")) {
    return "Irroba";
  }

  if (lower.includes("fbits") || lower.includes("wake.tech")) {
    return "Wake / Fbits";
  }

  if (lower.includes("mage/cookies") || lower.includes("magento")) {
    return "Magento";
  }

  if (server.includes("cloudflare")) {
    return "Plataforma Custom / Cloudflare";
  }

  return "Plataforma Não Identificada";
}
