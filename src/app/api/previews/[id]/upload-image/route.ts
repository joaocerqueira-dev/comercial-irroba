import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { CAPTURES_DIR, uploadFilePrefix } from "@/lib/files/captures";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_DIMENSION_PX = 3840;

const EXT_BY_SHARP_FORMAT: Record<string, string> = {
  png: ".png",
  jpeg: ".jpg",
  jpg: ".jpg",
  webp: ".webp",
  gif: ".gif",
  avif: ".avif",
};

function isSafeSvgBuffer(buf: Buffer): boolean {
  const text = buf.toString("utf8");
  const trimmed = text.trim();
  if (!/<svg[\s>]/i.test(trimmed)) return false;
  if (/<script[\s>]/i.test(trimmed)) return false;
  if (/<foreignobject[\s>]/i.test(trimmed)) return false;
  if (/\bon[a-z]+\s*=/i.test(trimmed)) return false;
  if (/(?:javascript|vbscript|data\s*:\s*text\/html)\s*:/i.test(trimmed)) return false;
  return true;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const preview = await prisma.storePreview.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!preview) {
    return NextResponse.json({ error: "Preview não encontrado." }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Envio inválido. Selecione um arquivo de imagem do seu computador." },
      { status: 400 }
    );
  }

  const entry = formData.get("file");
  if (!entry || typeof entry === "string" || typeof entry.arrayBuffer !== "function") {
    return NextResponse.json(
      { error: "Nenhum arquivo de imagem recebido." },
      { status: 400 }
    );
  }

  if (entry.size <= 0) {
    return NextResponse.json(
      { error: "O arquivo selecionado está vazio." },
      { status: 400 }
    );
  }

  if (entry.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "A imagem excede o limite máximo de 15 MB." },
      { status: 413 }
    );
  }

  const rawBuffer = Buffer.from(await entry.arrayBuffer());
  await fs.mkdir(CAPTURES_DIR, { recursive: true });
  const hash = crypto.randomBytes(5).toString("hex");
  const basePrefix = `${uploadFilePrefix(preview.id)}${Date.now()}-${hash}`;

  const looksLikeSvg =
    entry.type === "image/svg+xml" ||
    entry.name.toLowerCase().endsWith(".svg");

  if (looksLikeSvg) {
    if (!isSafeSvgBuffer(rawBuffer)) {
      return NextResponse.json(
        { error: "Arquivo SVG inválido ou contém elementos não permitidos." },
        { status: 400 }
      );
    }
    const filename = `${basePrefix}.svg`;
    await fs.writeFile(path.join(CAPTURES_DIR, filename), rawBuffer);
    return NextResponse.json({
      imageUrl: `/api/captures/${filename}`,
      width: null,
      height: null,
      filename,
    });
  }

  try {
    const image = sharp(rawBuffer, { animated: true });
    const meta = await image.metadata();
    const fmt = meta.format?.toLowerCase() ?? "";
    const ext = EXT_BY_SHARP_FORMAT[fmt];

    if (!ext || !meta.width || !meta.height) {
      return NextResponse.json(
        { error: "Formato não suportado. Envie PNG, JPG, WebP, GIF, AVIF ou SVG." },
        { status: 400 }
      );
    }

    const isAnimated = (meta.pages ?? 1) > 1;
    let outBuffer: Buffer = rawBuffer;
    let outWidth = meta.width;
    let outHeight = meta.height;

    if (!isAnimated) {
      const needsResize = meta.width > MAX_DIMENSION_PX || meta.height > MAX_DIMENSION_PX;
      const needsOrient = Boolean(meta.orientation && meta.orientation !== 1);
      if (needsResize || needsOrient) {
        let pipeline = sharp(rawBuffer).rotate();
        if (needsResize) {
          pipeline = pipeline.resize({
            width: MAX_DIMENSION_PX,
            height: MAX_DIMENSION_PX,
            fit: "inside",
            withoutEnlargement: true,
          });
        }
        const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
        outBuffer = data;
        outWidth = info.width;
        outHeight = info.height;
      }
    }

    const filename = `${basePrefix}${ext}`;
    await fs.writeFile(path.join(CAPTURES_DIR, filename), outBuffer);

    return NextResponse.json({
      imageUrl: `/api/captures/${filename}`,
      width: outWidth,
      height: outHeight,
      filename,
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível ler esta imagem. Envie um arquivo PNG, JPG, WebP, GIF, AVIF ou SVG válido." },
      { status: 400 }
    );
  }
}
