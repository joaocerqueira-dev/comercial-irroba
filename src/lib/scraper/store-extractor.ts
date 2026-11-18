import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import { chromium } from "playwright";
import { detectPlatform } from "./platform-detector";
import type { ExtractedProduct, ExtractedStoreData } from "@/lib/types/blueprint";

const BLOCKED_TRACKER_PATTERNS = [
  "googletagmanager.com",
  "google-analytics.com",
  "analytics.google.com",
  "connect.facebook.net",
  "facebook.com/tr",
  "static.hotjar.com",
  "clarity.ms",
  "analytics.tiktok.com",
  "code.jivosite.com",
  "d335luupugsy2.cloudfront.net", // RD Station
  "doubleclick.net",
  "googlesyndication.com",
];

export function parseBrlPrice(raw: string | number | undefined | null): number | undefined {
  if (valueIsNumber(raw)) {
    return raw > 0 ? Number(raw.toFixed(2)) : undefined;
  }
  if (!raw || typeof raw !== "string") return undefined;

  const cleaned = raw.replace(/\s+/g, " ").trim();
  // Match R$ 1.299,90 or 249,90 or 249.90
  const brMatch = cleaned.match(/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/);
  if (brMatch) {
    const normalized = brMatch[1].replace(/\./g, "").replace(",", ".");
    const num = parseFloat(normalized);
    return Number.isFinite(num) && num > 0 ? num : undefined;
  }

  const usMatch = cleaned.match(/(\d+(?:\.\d{1,2})?)/);
  if (usMatch) {
    const num = parseFloat(usMatch[1]);
    return Number.isFinite(num) && num > 0 ? num : undefined;
  }

  return undefined;
}

function valueIsNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function resolveAssetUrl(rawUrl: string | undefined | null, baseUrl: string): string | undefined {
  if (!rawUrl) return undefined;
  let trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith("data:image/svg+xml") || trimmed.startsWith("data:image/gif")) {
    return undefined;
  }
  if (trimmed.includes(",")) {
    // Possibly a srcset string; take the largest or first URL cleanly
    const candidates = trimmed
      .split(",")
      .map((part) => part.trim().split(/\s+/)[0])
      .filter(Boolean);
    trimmed = candidates[candidates.length - 1] ?? candidates[0] ?? "";
  }
  if (trimmed.startsWith("//")) {
    trimmed = `https:${trimmed}`;
  }
  try {
    const resolved = new URL(trimmed, baseUrl).toString();
    if (resolved.startsWith("http://") || resolved.startsWith("https://")) {
      return resolved;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function extractProductsFromJsonLd($: cheerio.CheerioAPI, baseUrl: string): ExtractedProduct[] {
  const products: ExtractedProduct[] = [];
  const seen = new Set<string>();

  $('script[type="application/ld+json"]').each((_, el) => {
    const rawJson = $(el).html();
    if (!rawJson) return;
    try {
      const parsed = JSON.parse(rawJson);
      const queue: unknown[] = Array.isArray(parsed) ? [...parsed] : [parsed];

      while (queue.length > 0) {
        const node = queue.shift();
        if (!node || typeof node !== "object") continue;
        const record = node as Record<string, unknown>;

        if (Array.isArray(record["@graph"])) {
          queue.push(...record["@graph"]);
        }
        if (record["@type"] === "ItemList" && Array.isArray(record["itemListElement"])) {
          for (const item of record["itemListElement"]) {
            if (item && typeof item === "object") {
              const itemRec = item as Record<string, unknown>;
              queue.push(itemRec.item ?? itemRec);
            }
          }
        }

        const nodeType = String(record["@type"] ?? "").toLowerCase();
        if (nodeType === "product" || nodeType.includes("product")) {
          const title = String(record["name"] ?? "").trim();
          const offersRaw = Array.isArray(record["offers"]) ? record["offers"][0] : record["offers"];
          const offers = offersRaw && typeof offersRaw === "object" ? (offersRaw as Record<string, unknown>) : {};
          const price = parseBrlPrice(
            (offers["price"] ?? offers["lowPrice"] ?? record["price"]) as string | number | undefined
          );
          const rawImg = Array.isArray(record["image"]) ? record["image"][0] : record["image"];
          const imgStr =
            typeof rawImg === "string"
              ? rawImg
              : rawImg && typeof rawImg === "object"
                ? String((rawImg as Record<string, unknown>)["url"] ?? "")
                : "";
          const imageUrl = resolveAssetUrl(imgStr, baseUrl);
          const productUrl = resolveAssetUrl(String(record["url"] ?? offers["url"] ?? ""), baseUrl);

          if (title && imageUrl && price && !seen.has(title.toLowerCase())) {
            seen.add(title.toLowerCase());
            products.push({
              id: `prod-ld-${products.length + 1}`,
              title,
              price,
              imageUrl,
              productUrl,
              category: String(record["category"] ?? "Destaques"),
              description: typeof record["description"] === "string" ? record["description"].slice(0, 260) : undefined,
            });
          }
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks
    }
  });

  return products;
}

export function extractStoreFromHtml(html: string, sourceUrl: string): ExtractedStoreData {
  const $ = cheerio.load(html);
  const detectedPlatform = detectPlatform(html);

  const ogSiteName = $('meta[property="og:site_name"]').attr("content")?.trim();
  const titleText = $("title").first().text().trim();
  const storeName =
    ogSiteName ||
    titleText.split(/[|\-–—•:]/)[0]?.trim() ||
    new URL(sourceUrl).hostname.replace(/^www\./, "");

  const description =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim();

  const faviconHref =
    $('link[rel="icon"]').attr("href") ||
    $('link[rel="shortcut icon"]').attr("href") ||
    $('link[rel="apple-touch-icon"]').attr("href");
  const faviconUrl = resolveAssetUrl(faviconHref, sourceUrl);

  // Logo heuristics
  const logoSelectors = [
    ".js-logo-container img",
    "header .logo img",
    "header [class*='logo'] img",
    ".header-logo img",
    "a[class*='logo'] img",
    "header a[href='/'] img",
    "header img",
  ];
  let logoUrl: string | undefined;
  for (const sel of logoSelectors) {
    const el = $(sel).first();
    const candidate =
      el.attr("data-src") || el.attr("src") || el.attr("data-original") || el.attr("srcset");
    const resolved = resolveAssetUrl(candidate, sourceUrl);
    if (resolved && !/whatsapp|flag|bandeira|pix|visa|master|elo/i.test(resolved)) {
      logoUrl = resolved;
      break;
    }
  }
  if (!logoUrl) {
    logoUrl = resolveAssetUrl($('meta[property="og:image"]').attr("content"), sourceUrl) ?? faviconUrl;
  }

  // Categories from nav
  const categories: ExtractedStoreData["categories"] = [];
  const seenCats = new Set<string>();
  const navSelectors = [
    "header nav a",
    ".js-nav-list-link",
    ".nav-desktop a",
    ".menu a",
    "nav[role='navigation'] a",
  ];
  for (const sel of navSelectors) {
    $(sel).each((_, el) => {
      if (categories.length >= 8) return;
      const label = $(el).text().replace(/\s+/g, " ").trim();
      const href = $(el).attr("href") ?? "#";
      if (
        label.length >= 2 &&
        label.length <= 32 &&
        !/login|entrar|conta|carrinho|rastrear|contato|busca/i.test(label) &&
        !seenCats.has(label.toLowerCase())
      ) {
        seenCats.add(label.toLowerCase());
        categories.push({
          label,
          href: resolveAssetUrl(href, sourceUrl) ?? "#",
        });
      }
    });
    if (categories.length >= 4) break;
  }

  // Banners
  const banners: ExtractedStoreData["banners"] = [];
  const seenBanners = new Set<string>();
  const bannerSelectors = [
    ".js-home-slider img",
    ".swiper-slide img",
    ".slider img",
    "[class*='banner'] img",
    "[class*='hero'] img",
    "main section:first-of-type img",
  ];
  for (const sel of bannerSelectors) {
    $(sel).each((_, el) => {
      if (banners.length >= 4) return;
      const candidate =
        $(el).attr("data-src") || $(el).attr("src") || $(el).attr("data-original") || $(el).attr("srcset");
      const imageUrl = resolveAssetUrl(candidate, sourceUrl);
      if (
        imageUrl &&
        !seenBanners.has(imageUrl) &&
        imageUrl !== logoUrl &&
        !/icon|logo|badge|selo|whatsapp|pix/i.test(imageUrl)
      ) {
        seenBanners.add(imageUrl);
        banners.push({
          imageUrl,
          alt: $(el).attr("alt")?.trim(),
        });
      }
    });
    if (banners.length > 0) break;
  }

  // Products: combine JSON-LD + embedded JSON product scripts + DOM cards
  const products = extractProductsFromJsonLd($, sourceUrl);
  const seenProducts = new Set(products.map((p) => p.title.toLowerCase()));

  $('script[type="application/json"]').each((_, el) => {
    if (products.length >= 16) return;
    const raw = $(el).html()?.trim();
    if (!raw || !raw.startsWith("{")) return;
    try {
      const obj = JSON.parse(raw) as Record<string, unknown>;
      const title = typeof obj.name === "string" ? obj.name.trim() : "";
      const price = parseBrlPrice(
        (obj.price_short ?? obj.price ?? obj.promotional_price) as string | number | undefined
      );
      const compareAtPrice = parseBrlPrice(
        (obj.compare_at_price_short ?? obj.compare_at_price) as string | number | undefined
      );
      const media = Array.isArray(obj.media) ? (obj.media[0] as Record<string, unknown> | undefined) : undefined;
      const rawImg =
        (typeof media?.url === "string" ? media.url : undefined) ??
        (typeof obj.image === "string" ? obj.image : undefined);
      const imageUrl = resolveAssetUrl(rawImg, sourceUrl);
      const productUrl = resolveAssetUrl(typeof obj.url === "string" ? obj.url : undefined, sourceUrl);

      if (title && imageUrl && price && !seenProducts.has(title.toLowerCase())) {
        seenProducts.add(title.toLowerCase());
        products.push({
          id: `prod-json-${products.length + 1}`,
          title: title.slice(0, 120),
          price,
          compareAtPrice: compareAtPrice && compareAtPrice > price ? compareAtPrice : undefined,
          imageUrl,
          productUrl,
          category: categories[0]?.label ?? "Destaques",
        });
      }
    } catch {
      // ignore non-product JSON scripts
    }
  });

  const cardSelectors = [
    ".js-item-product",
    ".product_card",
    ".item-product",
    ".product-item",
    ".product-card",
    ".product-block",
    "li.product",
    ".grid-item",
    "[class*='product-card']",
    "[class*='product_card']",
    "[class*='product-item']",
  ];

  for (const sel of cardSelectors) {
    $(sel).each((_, el) => {
      if (products.length >= 16) return;
      const card = $(el);
      const title =
        card
          .find(".js-item-name, .product_card_name, .item-name, .product-title, .product-name, h2, h3, h4, [class*='title'], [class*='name']")
          .first()
          .text()
          .replace(/\s+/g, " ")
          .trim() || card.find("a").attr("title")?.trim();

      const priceText = card
        .find(".js-price-display, .product_card_price_now, .price, .product-price, [class*='price_now'], [class*='price-current'], [class*='sale-price'], [class*='price']:not([class*='compare']):not([class*='old'])")
        .first()
        .text();
      const compareText = card
        .find(".js-compare-price-display, .product_card_price_old, .compare-price, .old-price, del, s, [class*='compare'], [class*='old']")
        .first()
        .text();

      const price = parseBrlPrice(priceText) ?? parseBrlPrice(card.text());
      const compareAtPrice = parseBrlPrice(compareText);

      const imgEl = card.find("img").first();
      const rawImg =
        imgEl.attr("data-src") ||
        imgEl.attr("data-srcset") ||
        imgEl.attr("src") ||
        imgEl.attr("data-original") ||
        imgEl.attr("srcset");
      const imageUrl = resolveAssetUrl(rawImg, sourceUrl);
      const productUrl = resolveAssetUrl(card.find("a").first().attr("href"), sourceUrl);

      if (title && title.length > 2 && imageUrl && price && !seenProducts.has(title.toLowerCase())) {
        seenProducts.add(title.toLowerCase());
        products.push({
          id: `prod-dom-${products.length + 1}`,
          title: title.slice(0, 120),
          price,
          compareAtPrice: compareAtPrice && compareAtPrice > price ? compareAtPrice : undefined,
          imageUrl,
          productUrl,
          category: categories[0]?.label ?? "Destaques",
        });
      }
    });
    if (products.length >= 12) break;
  }

  // Contacts
  const whatsappHref = $('a[href*="wa.me"], a[href*="whatsapp.com"]').first().attr("href");
  const waDigits = whatsappHref?.match(/(\d{10,13})/)?.[1];
  const instagramHref = $('a[href*="instagram.com"]').first().attr("href");
  const mailtoHref = $('a[href^="mailto:"]').first().attr("href");

  return {
    sourceUrl,
    detectedPlatform,
    storeName,
    description,
    logoUrl,
    faviconUrl,
    tokens: {
      headerIsOverlay: false,
    },
    categories,
    banners,
    products,
    contacts: {
      whatsapp: waDigits,
      instagram: instagramHref,
      email: mailtoHref?.replace(/^mailto:/i, "").split("?")[0],
    },
  };
}

async function tryShopifyProductsProbe(sourceUrl: string): Promise<ExtractedProduct[]> {
  try {
    const endpoint = new URL("/products.json?limit=16", sourceUrl).toString();
    const res = await fetch(endpoint, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      products?: Array<{
        id: number;
        title: string;
        product_type?: string;
        handle?: string;
        body_html?: string;
        images?: Array<{ src: string }>;
        variants?: Array<{ price: string; compare_at_price?: string | null }>;
      }>;
    };
    if (!Array.isArray(data.products)) return [];
    const origin = new URL(sourceUrl).origin;
    return data.products
      .map((p, idx): ExtractedProduct | null => {
        const imageUrl = p.images?.[0]?.src;
        const price = parseBrlPrice(p.variants?.[0]?.price);
        if (!p.title || !imageUrl || !price) return null;
        const compareAt = parseBrlPrice(p.variants?.[0]?.compare_at_price ?? undefined);
        return {
          id: `prod-shp-${p.id ?? idx + 1}`,
          title: p.title,
          price,
          compareAtPrice: compareAt && compareAt > price ? compareAt : undefined,
          imageUrl,
          productUrl: p.handle ? `${origin}/products/${p.handle}` : undefined,
          category: p.product_type || "Destaques",
          description: p.body_html?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 260),
        };
      })
      .filter((item): item is ExtractedProduct => item !== null);
  } catch {
    return [];
  }
}

export async function extractStoreFromUrl(
  rawUrl: string,
  slug: string
): Promise<ExtractedStoreData> {
  const normalizedUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  const capturesDir = path.join(process.cwd(), "public", "captures");
  await fs.mkdir(capturesDir, { recursive: true });
  const screenshotFile = `${slug}.png`;
  const screenshotDiskPath = path.join(capturesDir, screenshotFile);
  const screenshotPublicPath = `/api/captures/${screenshotFile}`;

  // Layer 1: Fast HTTP probe
  let fastHtml = "";
  let fastHeaders: Record<string, string> = {};
  try {
    const res = await fetch(normalizedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(7000),
    });
    fastHtml = await res.text();
    res.headers.forEach((v, k) => {
      fastHeaders[k.toLowerCase()] = v;
    });
  } catch {
    // Playwright will attempt direct load
  }

  const fastPlatform = fastHtml ? detectPlatform(fastHtml, fastHeaders) : "Desconhecida";

  // Layer 2: Playwright render + computed tokens + screenshot
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: "pt-BR",
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    });

    const page = await context.newPage();
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url().toLowerCase();
      if (BLOCKED_TRACKER_PATTERNS.some((p) => reqUrl.includes(p))) {
        return route.abort();
      }
      return route.continue();
    });

    await page.goto(normalizedUrl, { waitUntil: "domcontentloaded", timeout: 18000 });
    await page.waitForTimeout(1800);

    // Light scroll to trigger lazy-loaded product cards and banners
    await page.evaluate(async () => {
      window.scrollTo(0, 900);
      await new Promise((r) => setTimeout(r, 450));
      window.scrollTo(0, 1800);
      await new Promise((r) => setTimeout(r, 450));
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(700);

    await page.screenshot({ path: screenshotDiskPath, fullPage: false });

    const renderedHtml = await page.content();

    const domInspection = await page.evaluate(() => {
      const pickVisibleBg = (el: Element | null): string | undefined => {
        if (!el) return undefined;
        const bg = getComputedStyle(el).backgroundColor;
        if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg;
        return undefined;
      };

      const bodyStyle = getComputedStyle(document.body);
      const headerEl = document.querySelector("header");
      const headerStyle = headerEl ? getComputedStyle(headerEl) : null;
      const headerIsOverlay = headerStyle
        ? headerStyle.position === "fixed" || headerStyle.position === "absolute"
        : false;

      const headingEl =
        document.querySelector("h1, h2, .section-title, [class*='title']") ?? document.body;
      const headingFont = getComputedStyle(headingEl).fontFamily;
      const bodyFont = bodyStyle.fontFamily;

      // Find primary CTA button
      const ctaCandidates = Array.from(
        document.querySelectorAll(
          "a.btn-primary, button.btn-primary, .btn-buy, [class*='buy'], [class*='cta'], button[type='submit'], a.btn, button.btn"
        )
      );
      let primaryButtonBg: string | undefined;
      let primaryButtonColor: string | undefined;
      let borderRadiusPx: number | undefined;

      for (const btn of ctaCandidates) {
        const rect = btn.getBoundingClientRect();
        if (rect.width < 40 || rect.height < 20) continue;
        const st = getComputedStyle(btn);
        const bg = st.backgroundColor;
        if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
          primaryButtonBg = bg;
          primaryButtonColor = st.color;
          borderRadiusPx = parseFloat(st.borderRadius) || 0;
          break;
        }
      }

      // Live DOM extraction of wide banners & visible logos (better than raw HTML when JS sliders run)
      const wideImages = Array.from(document.querySelectorAll("img"))
        .map((img) => {
          const r = img.getBoundingClientRect();
          return {
            src: img.currentSrc || img.src,
            alt: img.alt,
            width: r.width,
            height: r.height,
            top: r.top,
          };
        })
        .filter((i) => i.src && i.width >= 600 && i.height >= 200 && i.top < 1100)
        .slice(0, 4);

      const headerLogo = Array.from(document.querySelectorAll<HTMLImageElement>("header img"))
        .map((img) => {
          const r = img.getBoundingClientRect();
          return { src: img.currentSrc || img.src, width: r.width, height: r.height };
        })
        .find((i) => i.src && i.width >= 40 && i.height >= 16 && i.width <= 420);

      return {
        bodyBackground: pickVisibleBg(document.body) ?? pickVisibleBg(document.documentElement),
        bodyForeground: bodyStyle.color,
        headerBackground: pickVisibleBg(headerEl),
        headerForeground: headerStyle?.color,
        headerIsOverlay,
        primaryButtonBg,
        primaryButtonColor,
        borderRadiusPx,
        headingFont,
        bodyFont,
        wideImages,
        headerLogoUrl: headerLogo?.src,
      };
    });

    const parsed = extractStoreFromHtml(renderedHtml, normalizedUrl);
    if (fastPlatform !== "Desconhecida" && parsed.detectedPlatform === "Plataforma Não Identificada") {
      parsed.detectedPlatform = fastPlatform;
    }

    if (domInspection.headerLogoUrl) {
      parsed.logoUrl = domInspection.headerLogoUrl;
    }

    if (domInspection.wideImages.length > 0) {
      const mergedBanners = domInspection.wideImages.map((img) => ({
        imageUrl: img.src,
        alt: img.alt,
      }));
      parsed.banners = mergedBanners;
    }

    if (parsed.detectedPlatform === "Shopify" && parsed.products.length < 6) {
      const shopifyProducts = await tryShopifyProductsProbe(normalizedUrl);
      if (shopifyProducts.length > parsed.products.length) {
        parsed.products = shopifyProducts;
      }
    }

    parsed.screenshotPath = screenshotPublicPath;
    parsed.tokens = {
      bodyBackground: domInspection.bodyBackground,
      bodyForeground: domInspection.bodyForeground,
      headerBackground: domInspection.headerBackground,
      headerForeground: domInspection.headerForeground,
      headerIsOverlay: domInspection.headerIsOverlay,
      primaryButtonBg: domInspection.primaryButtonBg,
      primaryButtonColor: domInspection.primaryButtonColor,
      accentColor: domInspection.primaryButtonBg,
      headingFont: domInspection.headingFont,
      bodyFont: domInspection.bodyFont,
      borderRadiusPx: domInspection.borderRadiusPx,
    };

    return parsed;
  } catch (error) {
    // Fallback to fast HTML extraction if Playwright fails
    if (fastHtml) {
      const fallback = extractStoreFromHtml(fastHtml, normalizedUrl);
      fallback.detectedPlatform = fastPlatform;
      if (fallback.detectedPlatform === "Shopify" && fallback.products.length < 4) {
        const shopifyProducts = await tryShopifyProductsProbe(normalizedUrl);
        if (shopifyProducts.length > 0) fallback.products = shopifyProducts;
      }
      return fallback;
    }
    throw error;
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }
}
