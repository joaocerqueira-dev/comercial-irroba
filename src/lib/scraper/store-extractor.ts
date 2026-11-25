import { BROWSER_USER_AGENT } from "@/lib/net/constants";
import crypto from "node:crypto";
import { getSharedBrowser } from "./browser";
import { isPublicHttpUrl } from "@/lib/net/safe-url";
import { mirrorFilePrefix } from "@/lib/files/captures";
import { fetchPublic, followPublicRedirects, readTextCapped } from "@/lib/net/safe-fetch";
import { gotoPublic, installSsrfGuard } from "./page-guard";
import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import type { APIRequestContext } from "playwright";
import { detectPlatform } from "./platform-detector";
import type {
  ExtractedBanner,
  ExtractedProduct,
  ExtractedStoreData,
} from "@/lib/types/blueprint";
import { MAX_IMAGE_URL_LENGTH } from "@/lib/types/blueprint";

function valueIsNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function parseBrlPrice(raw: string | number | undefined | null): number | undefined {
  if (valueIsNumber(raw)) {
    return raw > 0 ? Number(raw.toFixed(2)) : undefined;
  }
  if (!raw || typeof raw !== "string") return undefined;

  const cleaned = raw.replace(/\s+/g, " ").trim();
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

export function resolveAssetUrl(rawUrl: string | undefined | null, baseUrl: string): string | undefined {
  if (!rawUrl) return undefined;
  let trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith("data:image/svg+xml") || trimmed.startsWith("data:image/gif")) {
    return undefined;
  }
  // Parse srcset candidates safely (only split on commas followed by a URL / whitespace, not Cloudinary transforms)
  if (/\s\d+[wx]\b/.test(trimmed)) {
    const candidates = trimmed
      .split(/,\s+(?=(?:https?:|\/\/|\/))/)
      .map((part) => {
        const tokens = part.trim().split(/\s+/);
        const url = tokens[0] ?? "";
        const desc = tokens[1] ?? "";
        const score = desc.endsWith("w")
          ? parseFloat(desc) || 0
          : desc.endsWith("x")
            ? (parseFloat(desc) || 1) * 1000
            : 0;
        return { url, score };
      })
      .filter((c) => Boolean(c.url))
      .sort((a, b) => b.score - a.score);
    trimmed = candidates[0]?.url ?? trimmed;
  } else if (trimmed.includes(", http")) {
    const parts = trimmed.split(/,\s+/).map((p) => p.trim().split(/\s+/)[0]).filter(Boolean);
    trimmed = parts[parts.length - 1] ?? parts[0] ?? "";
  }
  if (trimmed.startsWith("//")) {
    trimmed = `https:${trimmed}`;
  }
  try {
    let resolved = new URL(trimmed, baseUrl).toString();
    if (!resolved.startsWith("http://") && !resolved.startsWith("https://")) {
      return undefined;
    }
    // Mesmo teto do blueprint (BlueprintImageUrlSchema): URL maior derrubaria a validação
    if (resolved.length > MAX_IMAGE_URL_LENGTH) {
      return undefined;
    }
    // Upgrade small Nuvemshop thumbnails (-240-0, -320-0, -480-0) to higher resolution
    if (/mitiendanube\.com/i.test(resolved)) {
      resolved = resolved.replace(/-(?:240|320|480)-0\.(webp|jpg|jpeg|png)$/i, "-1024-1024.$1");
    }
    return resolved;
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
          const rawImages = Array.isArray(record["image"]) ? record["image"] : record["image"] ? [record["image"]] : [];
          const images = rawImages
            .map((item) => {
              const str =
                typeof item === "string"
                  ? item
                  : item && typeof item === "object"
                    ? String((item as Record<string, unknown>)["url"] ?? "")
                    : "";
              return resolveAssetUrl(str, baseUrl);
            })
            .filter((u): u is string => Boolean(u));
          const imageUrl = images[0];
          const productUrl = resolveAssetUrl(String(record["url"] ?? offers["url"] ?? ""), baseUrl);
          const catName = String(record["category"] ?? "Destaques");

          if (title && imageUrl && price && !seen.has(title.toLowerCase())) {
            seen.add(title.toLowerCase());
            products.push({
              id: `prod-ld-${products.length + 1}`,
              title,
              price,
              imageUrl,
              images: images.slice(0, 5),
              productUrl,
              category: catName,
              categories: [catName],
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

function isUsefulNavLink(label: string, href: string): boolean {
  if (label.length < 2 || label.length > 34) return false;
  if (/login|entrar|cadastr|minha conta|carrinho|sacola|rastrear|buscar|pesquisar|whatsapp/i.test(label)) {
    return false;
  }
  if (/^javascript:|^mailto:|^tel:|account|login|cart|checkout|wishlist/i.test(href)) {
    return false;
  }
  return true;
}

function collectBannersFromSelector(
  $: cheerio.CheerioAPI,
  selector: string,
  slot: ExtractedBanner["slot"],
  sourceUrl: string,
  logoUrl: string | undefined,
  seen: Set<string>,
  limit: number
): ExtractedBanner[] {
  const result: ExtractedBanner[] = [];
  $(selector).each((_, el) => {
    if (result.length >= limit) return;
    const imgEl = $(el).is("img") ? $(el) : $(el).find("img").first();
    const raw =
      imgEl.attr("data-src") ||
      imgEl.attr("src") ||
      imgEl.attr("data-original") ||
      imgEl.attr("data-srcset") ||
      imgEl.attr("srcset");
    const imageUrl = resolveAssetUrl(raw, sourceUrl);
    if (
      !imageUrl ||
      seen.has(imageUrl) ||
      imageUrl === logoUrl ||
      /icon|logo|badge|selo|whatsapp|pix|visa|master|elo|payment/i.test(imageUrl)
    ) {
      return;
    }
    seen.add(imageUrl);
    const parentLink = imgEl.closest("a");
    const alt = imgEl.attr("alt")?.trim() || parentLink.attr("aria-label")?.trim() || parentLink.attr("title")?.trim();
    const label =
      $(el).find("h3, h4, span, p").first().text().replace(/\s+/g, " ").trim() || alt;
    result.push({
      imageUrl,
      alt,
      href: resolveAssetUrl(parentLink.attr("href"), sourceUrl),
      slot,
      label: label && label.length <= 48 ? label : undefined,
    });
  });
  return result;
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
    ".header_logo img",
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

  // Categories from nav (supports classic nav and modern Nuvemshop .header_nav_link)
  const categories: ExtractedStoreData["categories"] = [];
  const seenCats = new Set<string>();
  const navSelectors = [
    ".header_nav_link",
    ".header [class*='nav_link']",
    "header [class*='nav_link']",
    "header nav a",
    ".header nav a",
    ".js-nav-list-link",
    ".nav-desktop a",
    ".menu > li > a",
    "nav[role='navigation'] a",
    "header a[href]",
    ".header a[href]",
  ];
  // Tema Irroba: menu principal fica em nav#menu, fora do <header>
  $("nav#menu ul.navbar-nav > li.li-category > a").each((_, el) => {
    if (categories.length >= 9) return;
    const a = $(el);
    if (a.closest(".mobile-store-informations, .visible-xs").length > 0) return;
    const label = (a.text().replace(/\s+/g, " ").trim() || a.attr("title")?.trim() || "").trim();
    const href = a.attr("href") ?? "#";
    if (isUsefulNavLink(label, href) && !seenCats.has(label.toLowerCase())) {
      seenCats.add(label.toLowerCase());
      categories.push({ label, href: resolveAssetUrl(href, sourceUrl) ?? "#" });
    }
  });
  for (const sel of categories.length >= 4 ? [] : navSelectors) {
    $(sel).each((_, el) => {
      if (categories.length >= 9) return;
      // Skip links inside dropdown megamenu sublists when primary links exist
      if ($(el).closest("[class*='mega'], [class*='submenu'], [class*='dropdown']").length > 0) {
        return;
      }
      const label = $(el).text().replace(/\s+/g, " ").trim();
      const href = $(el).attr("href") ?? "#";
      if (isUsefulNavLink(label, href) && !seenCats.has(label.toLowerCase())) {
        seenCats.add(label.toLowerCase());
        categories.push({
          label,
          href: resolveAssetUrl(href, sourceUrl) ?? "#",
        });
      }
    });
    if (categories.length >= 4) break;
  }

  // Announcement bar text
  const announcementText =
    $(
      "[class*='announcement'], [class*='topbar'], [class*='overline'], [class*='promo-bar'], [data-store='header-advertising']"
    )
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || undefined;

  // Section headings in main
  const sectionHeadings: string[] = [];
  const seenHeadings = new Set<string>();
  $("main h1, main h2, [data-store] h2").each((_, el) => {
    if (sectionHeadings.length >= 10) return;
    if ($(el).closest(".product_card, .js-item-product, .product-item, .product-card").length > 0) {
      return;
    }
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text.length >= 3 && text.length <= 80 && !seenHeadings.has(text.toLowerCase())) {
      seenHeadings.add(text.toLowerCase());
      sectionHeadings.push(text);
    }
  });

  // Tema Irroba: títulos de vitrine (.heading_title ao lado de .product_module)
  $(".heading_title").each((_, el) => {
    if (sectionHeadings.length >= 10) return;
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text.length >= 3 && text.length <= 80 && !seenHeadings.has(text.toLowerCase())) {
      seenHeadings.add(text.toLowerCase());
      sectionHeadings.push(text);
    }
  });

  // Banners by slot
  const seenBanners = new Set<string>();
  // Tema Irroba: carrossel principal (.banner-v2.banner-carousel .item)
  const irrobaHero: ExtractedBanner[] = [];
  $(".banner-v2.banner-carousel .item").each((_, el) => {
    if (irrobaHero.length >= 3) return;
    const item = $(el);
    const link = item.find("a").first();
    const img = item.find("picture img, img").first();
    const raw =
      item.find("source.src-desktop").attr("srcset") ||
      img.attr("data-src") ||
      img.attr("src") ||
      img.attr("srcset");
    const imageUrl = resolveAssetUrl(raw, sourceUrl);
    if (!imageUrl || seenBanners.has(imageUrl) || imageUrl === logoUrl) return;
    seenBanners.add(imageUrl);
    const alt = link.attr("aria-label")?.trim() || img.attr("alt")?.trim() || undefined;
    const rawHref = link.attr("href");
    irrobaHero.push({
      imageUrl,
      alt,
      href: rawHref && rawHref !== "#" ? resolveAssetUrl(rawHref, sourceUrl) : undefined,
      slot: "hero",
      label: alt && alt.length <= 48 ? alt : undefined,
    });
  });
  const heroBanners = [
    ...irrobaHero,
    ...collectBannersFromSelector(
      $,
      "[data-store='home-hero'] img, .js-home-slider img, .hero-slider img, [class*='hero'] img",
      "hero",
      sourceUrl,
      logoUrl,
      seenBanners,
      Math.max(0, 3 - irrobaHero.length)
    ),
  ];
  if (heroBanners.length === 0) {
    heroBanners.push(
      ...collectBannersFromSelector(
        $,
        ".swiper-slide img, .slider img, main section:first-of-type img",
        "hero",
        sourceUrl,
        logoUrl,
        seenBanners,
        3
      )
    );
  }

  const slimBanners = collectBannersFromSelector(
    $,
    "[data-store*='slim'] img, [class*='banner-slim'] img, [class*='slim-banner'] img",
    "slim",
    sourceUrl,
    logoUrl,
    seenBanners,
    2
  );

  const moodBanners = collectBannersFromSelector(
    $,
    ".banner-v2.banner-grid .image a, [data-store*='mood'] a, [class*='mood'] a, [class*='mosaic'] a, [class*='banner-categories'] a",
    "mood",
    sourceUrl,
    logoUrl,
    seenBanners,
    4
  );

  const secondaryBanners = collectBannersFromSelector(
    $,
    "[data-store*='banner-full'] img, [class*='banner-full'] img, [class*='secondary-banner'] img",
    "secondary",
    sourceUrl,
    logoUrl,
    seenBanners,
    2
  );

  const benefitsBanners = collectBannersFromSelector(
    $,
    "[data-store*='benefit'] img, .benefits_image, [class*='benefit'] img, [class*='vantagen'] img, [class*='regua'] img",
    "benefits",
    sourceUrl,
    logoUrl,
    seenBanners,
    8
  );

  const banners: ExtractedBanner[] = [
    ...heroBanners,
    ...slimBanners,
    ...moodBanners,
    ...secondaryBanners,
    ...benefitsBanners,
  ];

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
      const mediaList = Array.isArray(obj.media) ? (obj.media as Array<Record<string, unknown>>) : [];
      const images = mediaList
        .map((m) => resolveAssetUrl(typeof m?.url === "string" ? m.url : undefined, sourceUrl))
        .filter((u): u is string => Boolean(u));
      if (images.length === 0 && typeof obj.image === "string") {
        const single = resolveAssetUrl(obj.image, sourceUrl);
        if (single) images.push(single);
      }
      const imageUrl = images[0];
      const productUrl = resolveAssetUrl(typeof obj.url === "string" ? obj.url : undefined, sourceUrl);

      if (title && imageUrl && price && !seenProducts.has(title.toLowerCase())) {
        seenProducts.add(title.toLowerCase());
        const matchedCats = categories
          .filter((c) => title.toLowerCase().includes(c.label.toLowerCase().replace(/s$/, "")))
          .map((c) => c.label);
        const primaryCat = matchedCats[0] ?? categories[0]?.label ?? "Destaques";
        products.push({
          id: `prod-json-${products.length + 1}`,
          title: title.slice(0, 120),
          price,
          compareAtPrice: compareAtPrice && compareAtPrice > price ? compareAtPrice : undefined,
          imageUrl,
          images: images.slice(0, 5),
          productUrl,
          category: primaryCat,
          categories: matchedCats.length > 0 ? matchedCats : [primaryCat],
        });
      }
    } catch {
      // ignore non-product JSON scripts
    }
  });

  // Tema Irroba: cards .product-thumb (dentro de .product-itens-list)
  $(".product-thumb").each((_, el) => {
    if (products.length >= 16) return;
    const card = $(el);
    const nameLink = card.find("h3.list_product_name a").first();
    const title = (
      nameLink.find("span").first().text().replace(/\s+/g, " ").trim() ||
      nameLink.attr("title")?.trim() ||
      ""
    ).trim();
    const price = parseBrlPrice(card.find(".caption p.price, .caption .price-new, .caption .price").first().text());
    const compareAtPrice = parseBrlPrice(card.find(".caption .price-old, .caption del, .caption s").first().text());
    const imgEl = card.find(".image img").first();
    const imageUrl = resolveAssetUrl(imgEl.attr("data-src") || imgEl.attr("src"), sourceUrl);
    const auxUrl = resolveAssetUrl(imgEl.attr("data-aux-src"), sourceUrl);
    const productUrl = resolveAssetUrl(
      card.find(".image a[href]").first().attr("href") || nameLink.attr("href"),
      sourceUrl
    );
    const badge = card.find(".label-product").first().text().replace(/\s+/g, " ").trim() || undefined;
    const sizes = Array.from(
      new Set(
        card
          .find(".product-sizes .size-name")
          .map((_, s) => $(s).text().replace(/\s+/g, " ").trim())
          .get()
          .filter(Boolean)
      )
    );
    if (!title || title.length <= 2 || !imageUrl || !price || seenProducts.has(title.toLowerCase())) return;
    seenProducts.add(title.toLowerCase());
    const matchedCats = categories
      .filter((c) => title.toLowerCase().includes(c.label.toLowerCase().replace(/s$/, "")))
      .map((c) => c.label);
    const primaryCat = matchedCats[0] ?? categories[0]?.label ?? "Destaques";
    products.push({
      id: `prod-dom-${products.length + 1}`,
      title: title.slice(0, 120),
      price,
      compareAtPrice: compareAtPrice && compareAtPrice > price ? compareAtPrice : undefined,
      imageUrl,
      images: auxUrl && auxUrl !== imageUrl ? [imageUrl, auxUrl] : [imageUrl],
      productUrl,
      category: primaryCat,
      categories: matchedCats.length > 0 ? matchedCats : [primaryCat],
      badge: badge && badge.length <= 40 ? badge : undefined,
      sizes: sizes.length > 0 ? sizes.slice(0, 12) : undefined,
    });
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
          .find(
            ".js-item-name, .product_card_name, .item-name, .product-title, .product-name, h2, h3, h4, [class*='title'], [class*='name']"
          )
          .first()
          .text()
          .replace(/\s+/g, " ")
          .trim() || card.find("a").attr("title")?.trim();

      const priceText = card
        .find(
          ".js-price-display, .product_card_price_now, .price, .product-price, [class*='price_now'], [class*='price-current'], [class*='sale-price'], [class*='price']:not([class*='compare']):not([class*='old'])"
        )
        .first()
        .text();
      const compareText = card
        .find(
          ".js-compare-price-display, .product_card_price_old, .compare-price, .old-price, del, s, [class*='compare'], [class*='old']"
        )
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
        const matchedCats = categories
          .filter((c) => title.toLowerCase().includes(c.label.toLowerCase().replace(/s$/, "")))
          .map((c) => c.label);
        const primaryCat = matchedCats[0] ?? categories[0]?.label ?? "Destaques";
        products.push({
          id: `prod-dom-${products.length + 1}`,
          title: title.slice(0, 120),
          price,
          compareAtPrice: compareAtPrice && compareAtPrice > price ? compareAtPrice : undefined,
          imageUrl,
          images: [imageUrl],
          productUrl,
          category: primaryCat,
          categories: matchedCats.length > 0 ? matchedCats : [primaryCat],
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
    announcementText,
    sectionHeadings,
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

/** Teto do JSON de produtos da Shopify (16 produtos cabem com folga). */
const SHOPIFY_JSON_MAX_BYTES = 2 * 1024 * 1024;

export async function tryShopifyProductsProbe(sourceUrl: string): Promise<ExtractedProduct[]> {
  try {
    const endpoint = new URL("/products.json?limit=16", sourceUrl).toString();
    // SSRF: fetchPublic revalida cada redirect
    const res = await fetchPublic(endpoint, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res) return [];
    if (!res.ok) {
      await res.body?.cancel().catch(() => undefined);
      return [];
    }
    const data = JSON.parse(await readTextCapped(res, SHOPIFY_JSON_MAX_BYTES)) as {
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
        const images = (p.images ?? []).map((i) => i.src).filter(Boolean);
        const imageUrl = images[0];
        const price = parseBrlPrice(p.variants?.[0]?.price);
        if (!p.title || !imageUrl || !price) return null;
        const compareAt = parseBrlPrice(p.variants?.[0]?.compare_at_price ?? undefined);
        const cat = p.product_type || "Destaques";
        return {
          id: `prod-shp-${p.id ?? idx + 1}`,
          title: p.title,
          price,
          compareAtPrice: compareAt && compareAt > price ? compareAt : undefined,
          imageUrl,
          images: images.slice(0, 5),
          productUrl: p.handle ? `${origin}/products/${p.handle}` : undefined,
          category: cat,
          categories: [cat],
          description: p.body_html?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 260),
        };
      })
      .filter((item): item is ExtractedProduct => item !== null);
  } catch {
    return [];
  }
}

/**
 * Leitura rápida do HTML (sem navegador). SSRF: fetchPublic valida cada redirect;
 * o corpo é cortado em 5 MB. Retorna html vazio em qualquer falha.
 */
export async function fetchStoreHtml(
  url: string
): Promise<{ html: string; headers: Record<string, string> }> {
  const headers: Record<string, string> = {};
  try {
    const res = await fetchPublic(url, {
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res) return { html: "", headers };
    const html = await readTextCapped(res);
    res.headers.forEach((v, k) => {
      headers[k.toLowerCase()] = v;
    });
    return { html, headers };
  } catch {
    // Playwright tenta o carregamento direto
    return { html: "", headers };
  }
}

export interface ExtractProgress {
  step: "fetch" | "render" | "screenshot" | "parse" | "images" | "fallback";
  message: string;
  /** 0..1 dentro da fase de extração */
  fraction: number;
}

export interface ExtractOptions {
  onProgress?: (p: ExtractProgress) => void;
  signal?: AbortSignal;
}

export async function extractStoreFromUrl(
  rawUrl: string,
  slug: string,
  options: ExtractOptions = {}
): Promise<ExtractedStoreData> {
  const { onProgress, signal } = options;
  const report = (p: ExtractProgress) => {
    try {
      onProgress?.(p);
    } catch {
      // progresso nunca deve quebrar a extração
    }
  };
  const normalizedUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  const capturesDir = path.join(process.cwd(), "public", "captures");
  await fs.mkdir(capturesDir, { recursive: true });
  const screenshotFile = `${slug}.png`;
  // Screenshot completo em JPEG: bem menor que PNG para páginas longas
  const fullScreenshotFile = `${slug}-full.jpg`;
  const screenshotDiskPath = path.join(capturesDir, screenshotFile);
  const fullScreenshotDiskPath = path.join(capturesDir, fullScreenshotFile);
  const screenshotPublicPath = `/api/captures/${screenshotFile}`;
  const fullScreenshotPublicPath = `/api/captures/${fullScreenshotFile}`;

  // Layer 1: Fast HTTP probe
  const { html: fastHtml, headers: fastHeaders } = await fetchStoreHtml(normalizedUrl);

  const fastPlatform = fastHtml ? detectPlatform(fastHtml, fastHeaders) : "Desconhecida";

  // Layer 2: Deep Playwright render + full scroll + computed palette & banners
  let context: Awaited<ReturnType<Awaited<ReturnType<typeof getSharedBrowser>>["newContext"]>> | null = null;
  try {
    signal?.throwIfAborted();
    report({ step: "render", message: "Abrindo a loja no navegador...", fraction: 0.1 });
    const browser = await getSharedBrowser();

    context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: "pt-BR",
      userAgent:
        BROWSER_USER_AGENT,
    });

    const page = await context.newPage();
    await installSsrfGuard(page);
    await gotoPublic(page, normalizedUrl, { waitUntil: "domcontentloaded", timeout: 22000 });
    await page.waitForTimeout(2000);

    // Full-page progressive scroll to trigger all lazy-loaded banners, shelves, and footer
    await page.evaluate(async () => {
      const maxScroll = Math.min(document.body.scrollHeight || 4200, 5600);
      for (let y = 600; y <= maxScroll; y += 700) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 380));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(900);

    await page.screenshot({ path: screenshotDiskPath, fullPage: false });
    await page
      .screenshot({ path: fullScreenshotDiskPath, fullPage: true, type: "jpeg", quality: 80 })
      .catch(() => undefined);
    signal?.throwIfAborted();
    report({ step: "parse", message: "Screenshots capturados. Lendo produtos, banners e paleta...", fraction: 0.45 });

    const renderedHtml = await page.content();

    const domInspection = await page.evaluate(() => {
      const pickVisibleBg = (el: Element | null): string | undefined => {
        if (!el) return undefined;
        const bg = getComputedStyle(el).backgroundColor;
        if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg;
        return undefined;
      };

      const bodyStyle = getComputedStyle(document.body);
      const bodyBackground = pickVisibleBg(document.body) ?? pickVisibleBg(document.documentElement);
      const headerEl = document.querySelector("header, .header, [class*='site-header']");
      const headerStyle = headerEl ? getComputedStyle(headerEl) : null;
      const headerIsOverlay = headerStyle
        ? headerStyle.position === "fixed" || headerStyle.position === "absolute"
        : false;

      // Announcement / Topbar sampling
      const announcementEl = document.querySelector(
        "[class*='announcement'], [class*='topbar'], [class*='overline'], [class*='promo-bar'], [data-store='header-advertising']"
      );
      const announcementBg = pickVisibleBg(announcementEl);
      const announcementFg = announcementEl ? getComputedStyle(announcementEl).color : undefined;
      const announcementText = announcementEl?.textContent?.replace(/\s+/g, " ").trim().slice(0, 120);

      // Alternating section surface color & benefits section background
      const benefitsSectionEl = document.querySelector(
        "[data-store*='benefit'], .home_benefits, .benefits, [class*='benefits-bar'], [class*='vantagens']"
      );
      const benefitsBackground =
        pickVisibleBg(benefitsSectionEl) ??
        pickVisibleBg(benefitsSectionEl?.parentElement ?? null);

      let surfaceBackground: string | undefined = benefitsBackground;
      if (!surfaceBackground) {
        const sections = Array.from(
          document.querySelectorAll("main > section, main > div, [data-store]")
        );
        for (const sec of sections) {
          const bg = pickVisibleBg(sec);
          if (bg && bg !== bodyBackground) {
            surfaceBackground = bg;
            break;
          }
        }
      }

      // Footer colors
      const footerEl = document.querySelector("footer");
      const footerBackground = pickVisibleBg(footerEl);
      const footerForeground = footerEl ? getComputedStyle(footerEl).color : undefined;

      const headingEl =
        document.querySelector("h1, h2, .section-title, [class*='title']") ?? document.body;
      const headingFont = getComputedStyle(headingEl).fontFamily;
      const bodyFont = bodyStyle.fontFamily;

      // Primary & secondary CTA buttons
      const ctaCandidates = Array.from(
        document.querySelectorAll(
          "a.btn-primary, button.btn-primary, .btn-buy, [class*='product_card_cta'], [class*='buy'], [class*='cta'], button[type='submit'], a.btn, button.btn"
        )
      );
      let primaryButtonBg: string | undefined;
      let primaryButtonColor: string | undefined;
      let secondaryButtonBg: string | undefined;
      let secondaryButtonColor: string | undefined;
      let borderRadiusPx: number | undefined;

      for (const btn of ctaCandidates) {
        const rect = btn.getBoundingClientRect();
        if (rect.width < 45 || rect.height < 22) continue;
        const st = getComputedStyle(btn);
        const bg = st.backgroundColor;
        if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
          if (!primaryButtonBg) {
            primaryButtonBg = bg;
            primaryButtonColor = st.color;
            borderRadiusPx = parseFloat(st.borderRadius) || 0;
          } else if (bg !== primaryButtonBg && !secondaryButtonBg) {
            secondaryButtonBg = bg;
            secondaryButtonColor = st.color;
            break;
          }
        }
      }

      // Classify live rendered banner images by geometry & position
      const seenSrcs = new Set<string>();
      const classifiedBanners: Array<{
        imageUrl: string;
        alt?: string;
        href?: string;
        slot: "hero" | "slim" | "secondary" | "mood";
        label?: string;
      }> = [];

      const imgs = Array.from(document.querySelectorAll<HTMLImageElement>("main img, section img"));
      for (const img of imgs) {
        const src = img.currentSrc || img.src;
        if (!src || seenSrcs.has(src)) continue;
        if (/icon|logo|badge|selo|whatsapp|pix|visa|master|elo/i.test(src)) continue;
        if (
          img.closest(
            ".product_card, .js-item-product, .product-item, .product-card, .product-thumb, footer, [data-store*='benefit'], .home_benefits, .benefits"
          )
        ) {
          continue;
        }
        const rect = img.getBoundingClientRect();
        const absTop = rect.top + window.scrollY;
        const w = rect.width;
        const h = rect.height;
        if (w < 160 || h < 70) continue;

        const aspect = w / h;
        const linkEl = img.closest("a");
        const href = linkEl?.getAttribute("href") || undefined;
        const alt = img.alt?.trim() || linkEl?.getAttribute("aria-label")?.trim() || undefined;

        if (w >= 580 && aspect >= 3.2) {
          seenSrcs.add(src);
          classifiedBanners.push({ imageUrl: src, alt, href, slot: "slim" });
        } else if (w >= 580 && h >= 180 && absTop < 1050) {
          seenSrcs.add(src);
          classifiedBanners.push({ imageUrl: src, alt, href, slot: "hero" });
        } else if (w >= 580 && h >= 160 && absTop >= 1050) {
          seenSrcs.add(src);
          classifiedBanners.push({ imageUrl: src, alt, href, slot: "secondary" });
        } else if (w >= 180 && w <= 560 && h >= 150 && absTop >= 600) {
          seenSrcs.add(src);
          const containerText =
            linkEl?.textContent?.replace(/\s+/g, " ").trim() ||
            img.parentElement?.textContent?.replace(/\s+/g, " ").trim();
          classifiedBanners.push({
            imageUrl: src,
            alt,
            href,
            slot: "mood",
            label: containerText && containerText.length <= 42 ? containerText : alt,
          });
        }
      }

      const headerLogo = Array.from(
        document.querySelectorAll<HTMLImageElement>("header img, .header img, .header_logo img")
      )
        .map((img) => {
          const r = img.getBoundingClientRect();
          return { src: img.currentSrc || img.src, width: r.width, height: r.height };
        })
        .find((i) => i.src && i.width >= 40 && i.height >= 16 && i.width <= 420);

      // Tema Irroba: menu principal em nav#menu (fora do <header>)
      const irrobaNavLinks = Array.from(
        document.querySelectorAll<HTMLAnchorElement>("nav#menu ul.navbar-nav > li.li-category > a")
      )
        .filter((a) => !a.closest(".mobile-store-informations, .visible-xs"))
        .map((a) => ({
          label: (a.textContent || a.title || "").replace(/\s+/g, " ").trim(),
          href: a.href,
        }))
        .filter((item) => item.label.length >= 2 && item.label.length <= 34);

      // Visible header nav links directly from live DOM
      const headerNavLinks = Array.from(
        document.querySelectorAll<HTMLAnchorElement>(
          ".header_nav_link, .header [class*='nav_link'], header [class*='nav_link'], header nav a, .header nav a, .js-nav-list-link, header a[href], .header a[href]"
        )
      )
        .filter((a) => !a.closest("[class*='mega'], [class*='submenu'], [class*='dropdown']"))
        .map((a) => ({
          label: (a.textContent || "").replace(/\s+/g, " ").trim(),
          href: a.href,
        }))
        .filter((item) => item.label.length >= 2 && item.label.length <= 34);
      const liveNavLinks = irrobaNavLinks.length >= 3 ? irrobaNavLinks : headerNavLinks;

      return {
        bodyBackground,
        bodyForeground: bodyStyle.color,
        surfaceBackground,
        benefitsBackground,
        announcementBackground: announcementBg,
        announcementForeground: announcementFg,
        announcementText,
        headerBackground: pickVisibleBg(headerEl),
        headerForeground: headerStyle?.color,
        headerIsOverlay,
        footerBackground,
        footerForeground,
        primaryButtonBg,
        primaryButtonColor,
        secondaryButtonBg,
        secondaryButtonColor,
        borderRadiusPx,
        headingFont,
        bodyFont,
        classifiedBanners,
        headerLogoUrl: headerLogo?.src,
        liveNavLinks,
      };
    });

    const parsed = extractStoreFromHtml(renderedHtml, normalizedUrl);
    if (fastPlatform !== "Desconhecida" && parsed.detectedPlatform === "Plataforma Não Identificada") {
      parsed.detectedPlatform = fastPlatform;
    }

    if (domInspection.headerLogoUrl) {
      parsed.logoUrl = domInspection.headerLogoUrl;
    }

    if (domInspection.liveNavLinks.length >= 3) {
      const seenNav = new Set<string>();
      const cleanNav: ExtractedStoreData["categories"] = [];
      for (const link of domInspection.liveNavLinks) {
        if (cleanNav.length >= 9) break;
        if (isUsefulNavLink(link.label, link.href) && !seenNav.has(link.label.toLowerCase())) {
          seenNav.add(link.label.toLowerCase());
          cleanNav.push({
            label: link.label,
            href: resolveAssetUrl(link.href, normalizedUrl) ?? "#",
          });
        }
      }
      if (cleanNav.length >= 3) {
        parsed.categories = cleanNav;
      }
    }

    if (domInspection.classifiedBanners.length > 0) {
      const mergedBanners: ExtractedBanner[] = domInspection.classifiedBanners.map((b) => ({
        imageUrl: b.imageUrl,
        alt: b.alt,
        href: resolveAssetUrl(b.href, normalizedUrl),
        slot: b.slot,
        label: b.label,
      }));
      const seenBannerUrls = new Set(mergedBanners.map((b) => b.imageUrl));
      for (const hb of parsed.banners) {
        if (!seenBannerUrls.has(hb.imageUrl)) {
          seenBannerUrls.add(hb.imageUrl);
          mergedBanners.push(hb);
        }
      }
      parsed.banners = mergedBanners;
    }

    if (domInspection.announcementText) {
      parsed.announcementText = domInspection.announcementText;
    }

    if (parsed.detectedPlatform === "Shopify" && parsed.products.length < 6) {
      const shopifyProducts = await tryShopifyProductsProbe(normalizedUrl);
      if (shopifyProducts.length > parsed.products.length) {
        parsed.products = shopifyProducts;
      }
    }

    parsed.screenshotPath = screenshotPublicPath;
    parsed.fullScreenshotPath = fullScreenshotPublicPath;
    parsed.tokens = {
      bodyBackground: domInspection.bodyBackground,
      bodyForeground: domInspection.bodyForeground,
      surfaceBackground: domInspection.surfaceBackground,
      benefitsBackground: domInspection.benefitsBackground,
      announcementBackground: domInspection.announcementBackground,
      announcementForeground: domInspection.announcementForeground,
      headerBackground: domInspection.headerBackground,
      headerForeground: domInspection.headerForeground,
      headerIsOverlay: domInspection.headerIsOverlay,
      footerBackground: domInspection.footerBackground,
      footerForeground: domInspection.footerForeground,
      primaryButtonBg: domInspection.primaryButtonBg,
      primaryButtonColor: domInspection.primaryButtonColor,
      secondaryButtonBg: domInspection.secondaryButtonBg,
      secondaryButtonColor: domInspection.secondaryButtonColor,
      accentColor: domInspection.primaryButtonBg,
      headingFont: domInspection.headingFont,
      bodyFont: domInspection.bodyFont,
      borderRadiusPx: domInspection.borderRadiusPx,
    };

    await enrichProductsByCategory(parsed, normalizedUrl);
    await mirrorCriticalImages(parsed, normalizedUrl, capturesDir, slug, page.request, (done, total) =>
      report({
        step: "images",
        message: `Copiando imagens da loja (${done}/${total})...`,
        fraction: 0.6 + 0.32 * (total ? done / total : 1),
      })
    );

    return parsed;
  } catch (error) {
    if (fastHtml) {
      const fallback = extractStoreFromHtml(fastHtml, normalizedUrl);
      fallback.detectedPlatform = fastPlatform;
      if (fallback.detectedPlatform === "Shopify" && fallback.products.length < 4) {
        const shopifyProducts = await tryShopifyProductsProbe(normalizedUrl);
        if (shopifyProducts.length > 0) fallback.products = shopifyProducts;
      }
      await enrichProductsByCategory(fallback, normalizedUrl);
      report({ step: "fallback", message: "Navegador falhou; usando leitura rápida do HTML...", fraction: 0.5 });
      await mirrorCriticalImages(fallback, normalizedUrl, capturesDir, slug);
      return fallback;
    }
    throw error;
  } finally {
    if (context) {
      await context.close().catch(() => undefined);
    }
  }
}

/** Retorna null para SVG: SVG pode carregar script e não é espelhado. */
function extFromContentType(ct: string, url: string): string | null {
  const lower = ct.toLowerCase();
  if (lower.includes("svg")) return null;
  if (/\.svg$/i.test(url.split("?")[0] ?? "")) return null;
  if (lower.includes("webp")) return ".webp";
  if (lower.includes("png")) return ".png";
  if (lower.includes("jpeg") || lower.includes("jpg")) return ".jpg";
  if (lower.includes("gif")) return ".gif";
  if (lower.includes("avif")) return ".avif";
  const pathExt = path.extname(url.split("?")[0] ?? "").toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"].includes(pathExt)) {
    return pathExt === ".jpeg" ? ".jpg" : pathExt;
  }
  return ".jpg";
}

/** Exportada para testes. */
export async function mirrorCriticalImages(
  store: ExtractedStoreData,
  refererUrl: string,
  capturesDir: string,
  slug: string,
  pwRequest?: APIRequestContext,
  onImageProgress?: (done: number, total: number) => void
): Promise<void> {
  const urlsToMirror = new Set<string>();
  const addUrl = (u?: string) => {
    if (u && (u.startsWith("http://") || u.startsWith("https://"))) {
      urlsToMirror.add(u);
    }
  };

  addUrl(store.logoUrl);
  for (const b of store.banners) addUrl(b.imageUrl);
  for (const c of store.categories.slice(0, 8)) addUrl(c.imageUrl);
  for (const p of store.products.slice(0, 28)) {
    addUrl(p.imageUrl);
    if (p.images[1]) addUrl(p.images[1]);
  }

  const urlList = Array.from(urlsToMirror).slice(0, 48);
  const localMap = new Map<string, string>();

  const downloadOne = async (rawUrl: string): Promise<void> => {
    const hash = crypto.createHash("sha1").update(rawUrl).digest("hex").slice(0, 12);
    const tryDownload = async (candidateUrl: string): Promise<{ buf: Buffer; ct: string } | null> => {
      // SSRF: valida antes de qualquer requisição (Playwright ou fetch)
      if (!(await isPublicHttpUrl(candidateUrl))) return null;
      try {
        if (pwRequest) {
          const res = await followPublicRedirects(
            candidateUrl,
            (u) =>
              pwRequest.get(u, {
                headers: {
                  Referer: refererUrl,
                  Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
                },
                timeout: 4500,
                maxRedirects: 0,
              }),
            (r) => ({ status: r.status(), location: r.headers()["location"] })
          );
          if (!res) return null;
          if (!res.ok()) return null;
          const ct = res.headers()["content-type"] || "";
          if (ct && !ct.toLowerCase().includes("image") && !ct.toLowerCase().includes("octet-stream")) {
            return null;
          }
          const buf = await res.body();
          if (buf.length < 300) return null;
          return { buf, ct };
        }
      } catch {
        // fallback to native fetch below
      }
      try {
        const res = await fetchPublic(candidateUrl, {
          headers: {
            "User-Agent":
              BROWSER_USER_AGENT,
            Referer: refererUrl,
            Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          },
          signal: AbortSignal.timeout(4500),
        });
        if (!res || !res.ok) return null;
        const ct = res.headers.get("content-type") || "";
        if (ct && !ct.toLowerCase().includes("image") && !ct.toLowerCase().includes("octet-stream")) {
          return null;
        }
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 300) return null;
        return { buf, ct };
      } catch {
        return null;
      }
    };

    let downloaded = await tryDownload(rawUrl);
    // If upgraded -1024-1024 Nuvemshop URL returned 404, gracefully retry -640-0 / -480-0
    if (!downloaded && /-1024-1024\.(webp|jpg|jpeg|png)$/i.test(rawUrl)) {
      downloaded =
        (await tryDownload(rawUrl.replace(/-1024-1024\./i, "-640-0."))) ??
        (await tryDownload(rawUrl.replace(/-1024-1024\./i, "-480-0.")));
    }

    if (!downloaded) return;
    const ext = extFromContentType(downloaded.ct, rawUrl);
    if (!ext) return;
    const filename = `${mirrorFilePrefix(slug)}${hash}${ext}`;
    const diskPath = path.join(capturesDir, filename);
    await fs.writeFile(diskPath, downloaded.buf);
    localMap.set(rawUrl, `/api/captures/${filename}`);
  };

  // Controlled concurrency of 8 downloads at a time
  const BATCH = 8;
  for (let i = 0; i < urlList.length; i += BATCH) {
    await Promise.allSettled(urlList.slice(i, i + BATCH).map((u) => downloadOne(u)));
    onImageProgress?.(Math.min(i + BATCH, urlList.length), urlList.length);
  }

  const remap = (u?: string): string | undefined => (u ? localMap.get(u) ?? u : u);

  store.logoUrl = remap(store.logoUrl);
  store.banners = store.banners.map((b) => ({
    ...b,
    imageUrl: localMap.get(b.imageUrl) ?? b.imageUrl,
  }));
  store.categories = store.categories.map((c) => ({
    ...c,
    imageUrl: remap(c.imageUrl),
  }));
  store.products = store.products.map((p) => ({
    ...p,
    imageUrl: localMap.get(p.imageUrl) ?? p.imageUrl,
    images: p.images.map((img) => localMap.get(img) ?? img),
  }));
}

async function enrichProductsByCategory(
  store: ExtractedStoreData,
  baseUrl: string
): Promise<void> {
  let baseHost = "";
  try {
    baseHost = new URL(baseUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return;
  }

  const candidateCategories = store.categories
    .filter((cat) => {
      if (!cat.href || cat.href === "#") return false;
      try {
        const u = new URL(cat.href);
        return u.hostname.replace(/^www\./, "").toLowerCase() === baseHost && u.pathname !== "/";
      } catch {
        return false;
      }
    })
    .slice(0, 8);

  if (candidateCategories.length === 0) return;

  const byTitle = new Map<string, ExtractedProduct>();
  for (const prod of store.products) {
    byTitle.set(prod.title.toLowerCase(), prod);
  }

  const results = await Promise.allSettled(
    candidateCategories.map(async (cat) => {
      const res = await fetchPublic(cat.href, {
        headers: {
          "User-Agent":
            BROWSER_USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(4500),
      });
      if (!res) throw new Error("URL interna bloqueada");
      if (!res.ok) {
        await res.body?.cancel().catch(() => undefined);
        return { cat, products: [] as ExtractedProduct[] };
      }
      const html = await readTextCapped(res);
      const catData = extractStoreFromHtml(html, cat.href);
      return { cat, products: catData.products.slice(0, 8) };
    })
  );

  for (const [catIdx, result] of results.entries()) {
    if (result.status !== "fulfilled") continue;
    const { cat, products } = result.value;

    for (const [pIdx, prod] of products.entries()) {
      const key = prod.title.toLowerCase();
      const existing = byTitle.get(key);
      if (existing) {
        if (!existing.categories.includes(cat.label)) {
          existing.categories.push(cat.label);
        }
        if (existing.category === "Destaques" || existing.category === store.categories[0]?.label) {
          existing.category = cat.label;
        }
      } else if (store.products.length < 48) {
        const enriched: ExtractedProduct = {
          ...prod,
          id: `prod-cat-${catIdx + 1}-${pIdx + 1}`,
          category: cat.label,
          categories: [cat.label],
        };
        byTitle.set(key, enriched);
        store.products.push(enriched);
      }
    }
  }
}
