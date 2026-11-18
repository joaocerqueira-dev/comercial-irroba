import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  const { filename } = await context.params;
  const safeName = path.basename(filename);

  if (!safeName.endsWith(".png")) {
    return new Response("Invalid file", { status: 400 });
  }

  const filePath = path.join(process.cwd(), "public", "captures", safeName);
  try {
    const buffer = await fs.readFile(filePath);
    return new Response(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
