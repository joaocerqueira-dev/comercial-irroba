import { notFound } from "next/navigation";
import {
  getPreviewWithBlueprint,
  resolveExtractionWarnings,
  resolveFullScreenshotPath,
  resolveMobileScreenshotPaths,
} from "@/lib/previews/repository";
import { normalizeBaseUrl } from "@/lib/public-url";
import { prisma } from "@/lib/db";
import StudioClient from "@/components/StudioClient";
import { getUserImageAi, getUserTextAi } from "@/lib/ai/providers";
import { canAccessPreview, requirePageUser } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export default async function StudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePageUser();
  const { id } = await params;
  const result = await getPreviewWithBlueprint({ id });
  if (result.status !== "ok" || !canAccessPreview(user, result.preview.ownerId)) {
    notFound();
  }
  // Abrir o Studio conta como ver as respostas; falha aqui não pode travar a página
  await prisma.clientResponse
    .updateMany({ where: { previewId: id, seenAt: null }, data: { seenAt: new Date() } })
    .catch((e: unknown) => console.error("[studio] marcar respostas como vistas falhou", e));
  const { preview, blueprint } = result;
  // Quem executa paga: IA do usuário logado. Só flags, nunca a chave.
  const [textAi, imageAi] = await Promise.all([getUserTextAi(user.id), getUserImageAi(user.id)]);
  const aiStatus = { text: Boolean(textAi), image: imageAi?.provider ?? null };
  const fullScreenshotPath = resolveFullScreenshotPath(preview);
  const { mobileScreenshotPath, mobileFullScreenshotPath } = resolveMobileScreenshotPaths(preview);

  return (
    <StudioClient
      id={preview.id}
      slug={preview.slug}
      sourceUrl={preview.sourceUrl}
      detectedPlatform={preview.detectedPlatform ?? "E-commerce"}
      generationMode={preview.generationMode}
      aiStatus={aiStatus}
      initialWhatsapp={preview.sellerWhatsapp ?? ""}
      screenshotPath={preview.screenshotPath}
      fullScreenshotPath={fullScreenshotPath}
      mobileScreenshotPath={mobileScreenshotPath}
      mobileFullScreenshotPath={mobileFullScreenshotPath}
      initialBlueprint={blueprint}
      publicAssetBaseUrl={normalizeBaseUrl(process.env.PUBLIC_ASSET_BASE_URL)}
      extractionWarnings={resolveExtractionWarnings(preview)}
    />
  );
}
