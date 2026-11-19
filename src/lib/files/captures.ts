import fs from "node:fs/promises";
import path from "node:path";

export const CAPTURES_DIR = path.join(process.cwd(), "public", "captures");
export const THUMBS_DIR = path.join(CAPTURES_DIR, ".thumbs");
export const THUMB_WIDTHS = [320, 480, 960] as const;

/** Remove arquivos de captura de um preview (screenshots, espelhos e imagens de IA). */
export async function deletePreviewCaptures(slug: string, previewId: string): Promise<number> {
  const prefixes = [`${slug}.`, `${slug}-full.`, `m-${slug.slice(0, 18)}-`, `ai-${previewId.slice(0, 10)}-`];
  let removed = 0;
  for (const dir of [CAPTURES_DIR, THUMBS_DIR]) {
    let entries: string[] = [];
    try {
      entries = await fs.readdir(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      const base = dir === THUMBS_DIR ? name.replace(/^\d+-/, "") : name;
      if (prefixes.some((p) => base.startsWith(p))) {
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
