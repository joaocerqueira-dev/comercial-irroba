#!/usr/bin/env node
/**
 * Coleta de lixo de public/captures: remove arquivos que não pertencem a nenhum
 * preview do banco.
 *
 *   npm run captures:gc                 # dry-run (padrão): só lista o que sairia
 *   npm run captures:gc -- --apply      # apaga de fato
 *   node scripts/captures-gc.mjs --dir /app/public/captures --min-age-minutes 120 --apply
 *
 * Um arquivo é MANTIDO se qualquer uma destas condições valer:
 * - é citado (/api/captures/<nome>) no extractedData, blueprint, compiledExport ou
 *   screenshotPath de algum preview;
 * - começa com um prefixo de algum preview existente (mesmos prefixos de
 *   src/lib/files/captures.ts, incluindo os antigos de 10/18 caracteres, por cautela);
 * - foi modificado há menos de --min-age-minutes (padrão 60), para não pegar uma
 *   geração ou upload em andamento.
 * Miniaturas (.thumbs/<largura>-<original>.webp) saem quando o original sai ou não existe.
 *
 * Script em JS puro (sem tsx/ts-node) para rodar na imagem de produção.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const LEGACY_ID_PREFIX_LENGTH = 10;
const LEGACY_SLUG_PREFIX_LENGTH = 18;
const DEFAULT_MIN_AGE_MS = 60 * 60 * 1000;

/**
 * Prefixos de arquivo de um preview (atuais e antigos).
 * @param {{ id: string; slug: string }} preview
 * @returns {string[]}
 */
export function previewFilePrefixes({ id, slug }) {
  const shortId = id.slice(0, LEGACY_ID_PREFIX_LENGTH);
  return [
    `${slug}.`,
    `${slug}-full.`,
    `${slug}-mobile.`,
    `${slug}-mobile-full.`,
    `m-${slug}--`,
    `ai-${id}-`,
    `up-${id}-`,
    // antigos (compartilháveis): mantidos por cautela
    `m-${slug.slice(0, LEGACY_SLUG_PREFIX_LENGTH)}-`,
    `ai-${shortId}-`,
    `up-${shortId}-`,
  ];
}

/**
 * Nomes de arquivo citados como /api/captures/<nome> em qualquer valor.
 * @param {unknown[]} values
 * @param {Set<string>} [into]
 */
export function collectRefs(values, into = new Set()) {
  for (const value of values) {
    if (value == null) continue;
    const text = typeof value === "string" ? value : JSON.stringify(value);
    for (const m of text.matchAll(/\/api\/captures\/([A-Za-z0-9._-]+)/g)) into.add(m[1]);
  }
  return into;
}

/**
 * Planeja a coleta (não apaga nada).
 * @param {{
 *   capturesDir: string;
 *   previews: Array<{ id: string; slug: string }>;
 *   referenced: Set<string>;
 *   now?: number;
 *   minAgeMs?: number;
 * }} opts
 * @returns {Promise<{ orphans: string[]; kept: number; bytes: number }>} caminhos relativos a capturesDir
 */
export async function planCapturesGc({ capturesDir, previews, referenced, now = Date.now(), minAgeMs = DEFAULT_MIN_AGE_MS }) {
  const prefixes = previews.flatMap(previewFilePrefixes);
  const isOwned = (name) => referenced.has(name) || prefixes.some((p) => name.startsWith(p));

  /** @type {string[]} */
  const orphans = [];
  const removedOriginals = new Set();
  const present = new Set();
  let kept = 0;
  let bytes = 0;

  const entries = await fs.readdir(capturesDir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isFile() || entry.name.startsWith(".")) continue;
    present.add(entry.name);
    const stat = await fs.stat(path.join(capturesDir, entry.name)).catch(() => null);
    if (!stat) continue;
    if (isOwned(entry.name) || now - stat.mtimeMs < minAgeMs) {
      kept++;
      continue;
    }
    orphans.push(entry.name);
    removedOriginals.add(entry.name);
    bytes += stat.size;
  }

  const thumbsDir = path.join(capturesDir, ".thumbs");
  const thumbs = await fs.readdir(thumbsDir, { withFileTypes: true }).catch(() => []);
  for (const entry of thumbs) {
    if (!entry.isFile()) continue;
    const original = entry.name.replace(/^\d+-/, "").replace(/\.webp$/, "");
    const stat = await fs.stat(path.join(thumbsDir, entry.name)).catch(() => null);
    if (!stat) continue;
    const orphanThumb = removedOriginals.has(original) || (!present.has(original) && now - stat.mtimeMs >= minAgeMs);
    if (orphanThumb) {
      orphans.push(path.join(".thumbs", entry.name));
      bytes += stat.size;
    } else {
      kept++;
    }
  }

  return { orphans, kept, bytes };
}

/**
 * Apaga os arquivos planejados.
 * @param {string} capturesDir
 * @param {string[]} orphans
 */
export async function applyCapturesGc(capturesDir, orphans) {
  let removed = 0;
  for (const rel of orphans) {
    await fs.unlink(path.join(capturesDir, rel)).then(
      () => removed++,
      () => undefined
    );
  }
  return removed;
}

/** Lê previews e referências do banco em lotes (compiledExport pode ser grande). */
async function loadFromDatabase() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    /** @type {Array<{ id: string; slug: string }>} */
    const previews = [];
    const referenced = new Set();
    let cursor;
    for (;;) {
      const batch = await prisma.storePreview.findMany({
        take: 50,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
        select: { id: true, slug: true, screenshotPath: true, extractedData: true, blueprint: true, compiledExport: true },
      });
      if (batch.length === 0) break;
      for (const p of batch) {
        previews.push({ id: p.id, slug: p.slug });
        collectRefs([p.screenshotPath, p.extractedData, p.blueprint, p.compiledExport], referenced);
      }
      cursor = batch[batch.length - 1].id;
    }
    return { previews, referenced };
  } finally {
    await prisma.$disconnect();
  }
}

/** @param {string[]} argv */
export function parseArgs(argv) {
  const opts = {
    apply: false,
    capturesDir: path.join(process.cwd(), "public", "captures"),
    minAgeMs: DEFAULT_MIN_AGE_MS,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--apply") opts.apply = true;
    else if (arg === "--dry-run") opts.apply = false;
    else if (arg === "--dir") opts.capturesDir = path.resolve(argv[++i] ?? "");
    else if (arg === "--min-age-minutes") {
      const minutes = Number(argv[++i]);
      if (!Number.isFinite(minutes) || minutes < 0) throw new Error("--min-age-minutes inválido");
      opts.minAgeMs = minutes * 60 * 1000;
    } else throw new Error(`Argumento desconhecido: ${arg}`);
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const { previews, referenced } = await loadFromDatabase();
  const plan = await planCapturesGc({ ...opts, previews, referenced });
  const mb = (plan.bytes / 1024 / 1024).toFixed(1);
  for (const rel of plan.orphans) console.log(`${opts.apply ? "apagando" : "órfão"}: ${rel}`);
  if (!opts.apply) {
    console.log(`[dry-run] ${plan.orphans.length} arquivo(s) órfão(s), ${mb} MB; ${plan.kept} mantido(s). Use --apply para apagar.`);
    return;
  }
  const removed = await applyCapturesGc(opts.capturesDir, plan.orphans);
  console.log(`${removed} arquivo(s) removido(s), ${mb} MB; ${plan.kept} mantido(s).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((err) => {
    console.error("[captures:gc] Falhou:", err);
    process.exit(1);
  });
}
