import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { CAPTURES_DIR, uploadFilePrefix } from "@/lib/files/captures";
import { limitAuthenticated } from "@/lib/net/rate-limit";
import { canAccessPreview, requireUser } from "@/lib/auth/guard";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_DIMENSION_PX = 3840;
/** Folga para os cabeçalhos do multipart além do arquivo em si. */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

const EXT_BY_SHARP_FORMAT: Record<string, string> = {
  png: ".png",
  jpeg: ".jpg",
  jpg: ".jpg",
  webp: ".webp",
  gif: ".gif",
  avif: ".avif",
};

/** Lado maior alvo do PNG gerado a partir de SVG (nítido para logos e banners). */
const SVG_RASTER_TARGET_PX = 2048;
/** Densidade máxima (DPI) usada ao rasterizar SVG: evita ampliar um SVG minúsculo sem limite. */
const SVG_MAX_DENSITY = 72 * 16;
/** Teto de pixels ao rasterizar SVG (width/height gigantes viram erro, não uma alocação enorme). */
const MAX_INPUT_PIXELS = 64_000_000;

/**
 * SVG nunca é salvo como SVG: é rasterizado para PNG. Isso elimina a classe inteira de XSS em
 * SVG (script, handlers, foreignObject, xlink:href javascript:...), em vez de filtrar por regex.
 */
async function rasterizeSvg(buf: Buffer): Promise<{ data: Buffer; width: number; height: number }> {
  const meta = await sharp(buf, { density: 72, limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  if (meta.format !== "svg" || !meta.width || !meta.height) {
    throw new Error("SVG inválido");
  }
  const longest = Math.max(meta.width, meta.height);
  const density = Math.min(SVG_MAX_DENSITY, Math.max(1, (72 * SVG_RASTER_TARGET_PX) / longest));
  const { data, info } = await sharp(buf, { density, limitInputPixels: MAX_INPUT_PIXELS })
    .resize({
      width: MAX_DIMENSION_PX,
      height: MAX_DIMENSION_PX,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireUser(req);
  if (user instanceof Response) return user;
  const limited = limitAuthenticated(req, "upload-image");
  if (limited) return limited;
  // Falha rápida pelo Content-Length declarado, antes de ler o corpo. Não cobre
  // Transfer-Encoding: chunked; o teto de verdade é o client_max_body_size do proxy.
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_UPLOAD_BYTES + MULTIPART_OVERHEAD_BYTES) {
    return NextResponse.json({ error: "A imagem excede o limite máximo de 15 MB." }, { status: 413 });
  }

  const { id } = await context.params;
  const preview = await prisma.storePreview.findUnique({
    where: { id },
    select: { id: true, ownerId: true },
  });
  if (!preview || !canAccessPreview(user, preview.ownerId)) {
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
    try {
      const { data, width, height } = await rasterizeSvg(rawBuffer);
      const filename = `${basePrefix}.png`;
      await fs.writeFile(path.join(CAPTURES_DIR, filename), data);
      return NextResponse.json({ imageUrl: `/api/captures/${filename}`, width, height, filename });
    } catch {
      return NextResponse.json(
        { error: "Arquivo SVG inválido ou grande demais para converter em imagem." },
        { status: 400 }
      );
    }
  }

  try {
    const image = sharp(rawBuffer, { animated: true });
    const meta = await image.metadata();
    const fmt = meta.format?.toLowerCase() ?? "";

    // Conteúdo SVG enviado com outro nome/MIME também é rasterizado
    if (fmt === "svg") {
      const { data, width, height } = await rasterizeSvg(rawBuffer);
      const filename = `${basePrefix}.png`;
      await fs.writeFile(path.join(CAPTURES_DIR, filename), data);
      return NextResponse.json({ imageUrl: `/api/captures/${filename}`, width, height, filename });
    }
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
