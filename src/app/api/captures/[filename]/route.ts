import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { getThumbnail, THUMB_WIDTHS } from "@/lib/files/captures";

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  const { filename } = await context.params;
  const safeName = path.basename(filename);
  const ext = path.extname(safeName).toLowerCase();
  const contentType = MIME_BY_EXT[ext];

  if (!contentType) {
    return new Response("Invalid file", { status: 400 });
  }

  // ?w=480 → miniatura WebP (sharp), com cache em disco
  const w = Number(req.nextUrl.searchParams.get("w"));
  if (w && ext !== ".svg" && (THUMB_WIDTHS as readonly number[]).includes(w)) {
    const thumb = await getThumbnail(safeName, w);
    if (thumb) {
      return new Response(new Uint8Array(thumb), {
        headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=86400", ...SECURITY_HEADERS },
      });
    }
  }

  const filePath = path.join(process.cwd(), "public", "captures", safeName);
  try {
    const buffer = await fs.readFile(filePath);
    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
        ...SECURITY_HEADERS,
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
