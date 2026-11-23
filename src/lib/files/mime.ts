import path from "node:path";

export const IMAGE_MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

export function mimeFromFilename(filename: string, fallback = "image/png"): string {
  return IMAGE_MIME_BY_EXT[path.extname(filename).toLowerCase()] ?? fallback;
}
