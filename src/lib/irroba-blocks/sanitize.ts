import * as cheerio from "cheerio";
import { FONT_FALLBACKS, PALETTE } from "@/lib/layout-patterns";
/**
 * Utilities to sanitize scraped store content before compiling HTML/CSS blocks.
 */

export function escapeHtml(input: string | undefined | null): string {
  if (!input) return "";
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function escapeAttr(input: string | undefined | null): string {
  return escapeHtml(input).replaceAll("`", "&#96;");
}

export function sanitizeUrl(url: string | undefined | null, fallback = "#"): string {
  if (!url) return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return fallback;
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/** JSON seguro para interpolar dentro de <script>: escapa <, >, &, U+2028 e U+2029. */
export function safeJsonForScript(value: unknown): string {
  return (JSON.stringify(value) ?? "null")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** Texto seguro dentro de comentário CSS (impede fechar o comentário ou abrir tags). */
export function escapeCssComment(input: string | undefined | null): string {
  if (!input) return "";
  return input.replace(/\*\//g, "* /").replace(/\/\*/g, "/ *").replace(/[<>]/g, "");
}

export function sanitizeCssColor(color: string | undefined | null, fallback: string = PALETTE.ink): string {
  if (!color) return fallback;
  const trimmed = color.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) {
    return trimmed;
  }
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(\s*,\s*(0|1|0?\.\d+))?\s*\)$/.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

export function sanitizeFontName(font: string | undefined | null, fallback: string = FONT_FALLBACKS.body): string {
  if (!font) return fallback;
  const cleaned = font.replace(/['";{}<>]/g, "").split(",")[0]?.trim();
  return cleaned || fallback;
}

export function formatBrl(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Começo de célula que uma planilha leria como fórmula. O CSV vai para a importação do
 * Irroba (não para uma planilha), então texto comum como "- Tecido" ou "+ brinde" não
 * ganha apóstrofo: `+`/`-` só contam quando seguidos de algo que não seja espaço nem letra
 * (dígito, `(`, `=`...). `=`, `@`, tab e CR no início sempre contam.
 */
const CSV_FORMULA_PREFIX_RE = /^(?:[=@\t\r]|[+-][^\s\p{L}])/u;

export function escapeCsvCell(value: string | number | undefined | null): string {
  let str = String(value ?? "");
  // CSV injection: texto que começa como fórmula ganha um apóstrofo (números ficam como estão)
  if (typeof value === "string" && CSV_FORMULA_PREFIX_RE.test(str)) str = `'${str}`;
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r") ||
    str.includes(";")
  ) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

const FORBIDDEN_CUSTOM_HTML_TAGS = [
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "applet",
  "base",
  "meta",
  "link",
  "head",
  "html",
  "body",
  "form",
  "input",
  "textarea",
  "select",
  "template",
  "noscript",
].join(", ");

const FORBIDDEN_STYLE_PATTERN =
  /expression\s*\(|javascript\s*:|vbscript\s*:|@import|-moz-binding|behavior\s*:|url\s*\(\s*['"]?\s*(?:javascript|vbscript|data\s*:)/i;

function sanitizeInlineStyle(rawStyle: string): string {
  const withoutComments = rawStyle.replace(/\/\*[\s\S]*?\*\//g, "");
  const cleanDecls = withoutComments
    .split(";")
    .map((decl) => decl.trim())
    .filter((decl) => {
      if (!decl) return false;
      const collapsed = decl.replace(/\\+|[\s\u0000-\u001F]+/g, "");
      if (FORBIDDEN_STYLE_PATTERN.test(decl) || FORBIDDEN_STYLE_PATTERN.test(collapsed)) {
        return false;
      }
      return true;
    });
  return cleanDecls.join("; ");
}

/**
 * Sanitizes custom HTML blocks (user-authored or AI-generated) for safe rendering
 * and SunEditor compatibility (inline CSS only, zero scripts/event handlers).
 */
export function sanitizeCustomHtmlBlock(rawHtml: string | undefined | null): string {
  if (!rawHtml || !rawHtml.trim()) return "";
  const $ = cheerio.load(`<div id="__irb_sanitize_root__">${rawHtml}</div>`);
  const root = $("#__irb_sanitize_root__");

  root.find(FORBIDDEN_CUSTOM_HTML_TAGS).remove();

  root.find("*").each((_, el) => {
    const node = $(el);
    const attribs = (el as unknown as { attribs?: Record<string, string> }).attribs;
    if (!attribs) return;

    for (const attrName of Object.keys(attribs)) {
      const lower = attrName.toLowerCase();
      const rawVal = attribs[attrName] ?? "";

      if (lower.startsWith("on") || lower === "srcdoc" || lower === "formaction" || lower === "xlink:href") {
        node.removeAttr(attrName);
        continue;
      }

      if (lower === "src") {
        const cleanSrc = sanitizeUrl(rawVal, "");
        if (!cleanSrc) node.removeAttr(attrName);
        else node.attr(attrName, cleanSrc);
        continue;
      }

      if (lower === "href" || lower === "poster" || lower === "cite") {
        node.attr(attrName, sanitizeUrl(rawVal, "#"));
        continue;
      }

      if (lower === "srcset") {
        const cleanCandidates = rawVal
          .split(/,\s+/)
          .map((part) => {
            const [u, ...rest] = part.trim().split(/\s+/);
            const clean = sanitizeUrl(u, "");
            return clean ? [clean, ...rest].join(" ") : "";
          })
          .filter(Boolean);
        if (cleanCandidates.length === 0) node.removeAttr(attrName);
        else node.attr(attrName, cleanCandidates.join(", "));
        continue;
      }

      if (lower === "style") {
        const cleanStyle = sanitizeInlineStyle(rawVal);
        if (!cleanStyle) node.removeAttr(attrName);
        else node.attr(attrName, cleanStyle);
      }
    }
  });

  return root.html()?.trim() ?? "";
}

/**
 * Validates HTML against SunEditor compatibility rules and returns user-facing warnings.
 */
export function validateSunEditorHtml(rawHtml: string): string[] {
  if (!rawHtml || !rawHtml.trim()) return [];
  const warnings: string[] = [];
  if (/<script[\s>]/i.test(rawHtml)) {
    warnings.push("Tags <script> não são permitidas no SunEditor e serão removidas automaticamente.");
  }
  if (/<style[\s>]/i.test(rawHtml)) {
    warnings.push("Tags <style> não são aceitas pelo SunEditor — use apenas estilos inline (style=\"...\").");
  }
  if (/<iframe[\s>]/i.test(rawHtml)) {
    warnings.push("Tags <iframe> serão removidas por segurança na publicação.");
  }
  if (/<form[\s>]/i.test(rawHtml)) {
    warnings.push("Tags <form> não são suportadas dentro de blocos Conteúdo HTML e serão removidas.");
  }
  if (/\son[a-z]+\s*=/i.test(rawHtml)) {
    warnings.push("Atributos de evento inline (onclick, onerror, etc.) não são permitidos e serão removidos.");
  }
  if (/javascript\s*:|vbscript\s*:|expression\s*\(/i.test(rawHtml)) {
    warnings.push("Expressões ou URLs javascript:/vbscript: detectadas e bloqueadas por segurança.");
  }
  return warnings;
}
