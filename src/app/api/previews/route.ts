import { PREVIEW_STATUS } from "@/lib/previews/status";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guard";

// GET é só leitura: a limpeza de previews presos roda no boot (src/instrumentation.ts)
// e no POST do generate (lib/previews/maintenance.ts).
export async function GET(req: Request) {
  const user = await requireUser(req);
  if (user instanceof Response) return user;
  // Comercial vê só as próprias; o filtro ?owner= só vale para admin
  const ownerId =
    user.role === "admin" ? new URL(req.url).searchParams.get("owner") || undefined : user.id;

  const previews = await prisma.storePreview.findMany({
    where: { status: PREVIEW_STATUS.ready, ...(ownerId ? { ownerId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      slug: true,
      sourceUrl: true,
      detectedPlatform: true,
      storeName: true,
      generationMode: true,
      aiProvider: true,
      aiModel: true,
      status: true,
      screenshotPath: true,
      createdAt: true,
      updatedAt: true,
      shareStatus: true,
      legacyPublic: true,
      shareExpiresAt: true,
      _count: { select: { responses: { where: { seenAt: null } } } },
      owner: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    previews: previews.map(({ _count, ...p }) => ({ ...p, unseenResponses: _count.responses })),
  });
}
