import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  const { filename } = await context.params;
  const safeName = path.basename(filename);
  const ext = path.extname(safeName).toLowerCase();
  const contentType = MIME_BY_EXT[ext];

  if (!contentType) {
    return new Response("Invalid file", { status: 400 });
  }

  const filePath = path.join(process.cwd(), "public", "captures", safeName);
  try {
    const buffer = await fs.readFile(filePath);
    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
