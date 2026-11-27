import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  getPreviewWithBlueprint,
  resolveFullScreenshotPath,
  resolveMobileScreenshotPaths,
} from "@/lib/previews/repository";
import PreviewViewerClient from "@/components/PreviewViewerClient";
import ShareNotice from "@/components/share/ShareNotice";
import SharePasswordForm from "@/components/share/SharePasswordForm";
import { getOptionalPageUser } from "@/lib/auth/guard";
import {
  getShareSecret,
  resolveShareAccess,
  shareCookieName,
  ShareSecretMissingError,
  type ShareAccess,
  type ShareablePreview,
} from "@/lib/share/access";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const preview = await prisma.storePreview.findUnique({
    where: { slug },
    select: { storeName: true, screenshotPath: true, legacyPublic: true },
  });
  if (!preview) return { title: "Prévia não encontrada · Irroba" };
  // Link com senha: nada da loja no título nem na imagem de compartilhamento
  if (!preview.legacyPublic) return { title: "Prévia de loja · Irroba", robots: { index: false, follow: false } };
  const title = `${preview.storeName} na Irroba · Prévia da nova loja`;
  const description = `Veja como a loja ${preview.storeName} pode ficar na plataforma Irroba.`;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      ...(preview.screenshotPath ? { images: [{ url: preview.screenshotPath }] } : {}),
    },
  };
}

let secretWarned = false;

async function pageAccess(p: ShareablePreview): Promise<ShareAccess> {
  try {
    const access = resolveShareAccess(p, {
      cookieValue: (await cookies()).get(shareCookieName(p.slug))?.value,
      user: await getOptionalPageUser(),
    });
    // Sem cookie a verificação não chega a ler o segredo; sem ele o unlock daria 503
    if (access === "needs-password") getShareSecret();
    return access;
  } catch (e) {
    if (!(e instanceof ShareSecretMissingError)) throw e;
    if (!secretWarned) {
      secretWarned = true;
      console.error("[share] Compartilhamento indisponível: defina SESSION_SECRET.");
    }
    return "unavailable";
  }
}

export default async function PublicPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getPreviewWithBlueprint({ slug });
  if (result.status !== "ok") {
    notFound();
  }
  const { preview } = result;
  const access = await pageAccess(preview);
  if (access === "needs-password") return <SharePasswordForm slug={preview.slug} />;
  if (access === "expired") {
    return <ShareNotice title="Proposta expirada, fale com seu comercial" whatsapp={preview.sellerWhatsapp} />;
  }
  if (access === "unavailable") return <ShareNotice title="Proposta indisponível" />;
  const fullScreenshotPath = resolveFullScreenshotPath(preview);
  const { mobileScreenshotPath, mobileFullScreenshotPath } = resolveMobileScreenshotPaths(preview);

  return (
    <PreviewViewerClient
      slug={preview.slug}
      storeName={preview.storeName}
      sourceUrl={preview.sourceUrl}
      detectedPlatform={preview.detectedPlatform ?? "E-commerce"}
      screenshotPath={preview.screenshotPath}
      fullScreenshotPath={fullScreenshotPath}
      mobileScreenshotPath={mobileScreenshotPath}
      mobileFullScreenshotPath={mobileFullScreenshotPath}
      sellerWhatsapp={preview.sellerWhatsapp}
    />
  );
}
