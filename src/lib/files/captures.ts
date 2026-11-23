import fs from "node:fs/promises";
import path from "node:path";

export const CAPTURES_DIR = path.join(process.cwd(), "public", "captures");
export const THUMBS_DIR = path.join(CAPTURES_DIR, ".thumbs");
export const THUMB_WIDTHS = [320, 480, 960] as const;

/**
 * Prefixo dos espelhos de imagem de um preview. Usa o slug completo e "--"
 * (o slug nunca contém "--"), então não colide com outros previews.
 */
export function mirrorFilePrefix(slug: string): string {
  return `m-${slug}--`;
}

/** Prefixo antigo (truncado), compartilhado entre versões da mesma loja. */
export function legacyMirrorPrefix(slug: string): string {
  return `m-${slug.slice(0, 18)}-`;
}

/** Nomes de arquivos em /api/captures/ citados em qualquer valor (JSON). */
export function collectCaptureRefs(values: unknown[]): Set<string> {
  const refs = new Set<string>();
  for (const value of values) {
    if (value == null) continue;
    const text = typeof value === "string" ? value : JSON.stringify(value);
    for (const m of text.matchAll(/\/api\/captures\/([A-Za-z0-9._-]+)/g)) {
      refs.add(m[1]);
    }
  }
  return refs;
}

export interface DeleteCapturesOptions {
  /**
   * Arquivos citados por outros previews. Espelhos com prefixo antigo só são
   * apagados se não estiverem aqui; sem este conjunto, são mantidos.
   */
  referencedElsewhere?: Set<string>;
  capturesDir?: string;
}

/** Remove arquivos de captura exclusivos de um preview (screenshots, espelhos e imagens de IA). */
export async function deletePreviewCaptures(
  slug: string,
  previewId: string,
  options: DeleteCapturesOptions = {}
): Promise<number> {
  const capturesDir = options.capturesDir ?? CAPTURES_DIR;
  const thumbsDir = path.join(capturesDir, ".thumbs");
  const exclusivePrefixes = [`${slug}.`, `${slug}-full.`, mirrorFilePrefix(slug), `ai-${previewId.slice(0, 10)}-`];
  const legacyPrefix = legacyMirrorPrefix(slug);
  const shouldDelete = (original: string): boolean => {
    if (exclusivePrefixes.some((p) => original.startsWith(p))) return true;
    if (original.startsWith(legacyPrefix)) {
      return Boolean(options.referencedElsewhere) && !options.referencedElsewhere!.has(original);
    }
    return false;
  };
  let removed = 0;
  for (const dir of [capturesDir, thumbsDir]) {
    let entries: string[] = [];
    try {
      entries = await fs.readdir(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      // miniaturas: "<largura>-<arquivo original>.webp"
      const original = dir === thumbsDir ? name.replace(/^\d+-/, "").replace(/\.webp$/, "") : name;
      if (shouldDelete(original)) {
        await fs.unlink(path.join(dir, name)).then(() => removed++, () => undefined);
      }
    }
  }
  return removed;
}

/** Miniatura WebP em cache em disco (gerada sob demanda com sharp). */
export async function getThumbnail(safeName: string, width: number): Promise<Buffer | null> {
  const thumbPath = path.join(THUMBS_DIR, `${width}-${safeName}.webp`);
  try {
    return await fs.readFile(thumbPath);
  } catch {
    // gera abaixo
  }
  try {
    const { default: sharp } = await import("sharp");
    const src = await fs.readFile(path.join(CAPTURES_DIR, safeName));
    const buf = await sharp(src).resize({ width, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
    await fs.mkdir(THUMBS_DIR, { recursive: true });
    await fs.writeFile(thumbPath, buf).catch(() => undefined);
    return buf;
  } catch {
    return null;
  }
}
