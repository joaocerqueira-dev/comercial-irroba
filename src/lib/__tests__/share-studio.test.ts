import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { TEST_USERS, withSession } from "./fixtures";

const db = vi.hoisted(() => ({
  storePreview: { findMany: vi.fn(async () => [] as unknown[]) },
  clientResponse: { updateMany: vi.fn(async () => ({ count: 1 })) },
}));
vi.mock("@/lib/db", () => ({ prisma: db }));
const sess = vi.hoisted(() => ({ getUserFromToken: vi.fn() }));
vi.mock("@/lib/auth/session", async (orig) => ({ ...(await orig<object>()), ...sess }));
const guard = vi.hoisted(() => ({ requirePageUser: vi.fn() }));
vi.mock("@/lib/auth/guard", async (orig) => ({ ...(await orig<object>()), ...guard }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/lib/previews/repository", () => ({
  getPreviewWithBlueprint: vi.fn(async () => ({
    status: "ok",
    preview: { id: "abc", slug: "loja", ownerId: "u-owner", sourceUrl: "https://x.com", generationMode: "heuristic" },
    blueprint: {},
  })),
  resolveExtractionWarnings: () => [],
  resolveFullScreenshotPath: () => null,
  resolveMobileScreenshotPaths: () => ({}),
}));
vi.mock("@/components/StudioClient", () => ({ default: () => null }));
const ai = vi.hoisted(() => ({ text: vi.fn(), image: vi.fn() }));
vi.mock("@/lib/ai/providers", () => ({ getUserTextAi: ai.text, getUserImageAi: ai.image }));

import { GET as LIST } from "@/app/api/previews/route";
import StudioPage from "@/app/studio/[id]/page";

beforeEach(() => {
  vi.clearAllMocks();
  ai.text.mockResolvedValue(null);
  ai.image.mockResolvedValue(null);
});

describe("lista de propostas", () => {
  it("pede contagem de respostas não vistas e campos de compartilhamento", async () => {
    sess.getUserFromToken.mockResolvedValue(TEST_USERS.comercial);
    db.storePreview.findMany.mockResolvedValue([
      { id: "a", shareStatus: "pendente", legacyPublic: false, shareExpiresAt: null, _count: { responses: 2 } },
    ]);
    const res = await LIST(new NextRequest("http://localhost/api/previews", withSession({})));
    const args = db.storePreview.findMany.mock.calls[0] as unknown as [{ select: Record<string, unknown> }];
    const sel = args[0].select;
    expect(sel._count).toEqual({ select: { responses: { where: { seenAt: null } } } });
    expect(sel.shareStatus).toBe(true);
    expect(sel.legacyPublic).toBe(true);
    expect(sel.shareExpiresAt).toBe(true);
    const { previews } = await res.json();
    expect(previews[0].unseenResponses).toBe(2);
    expect(previews[0].shareStatus).toBe("pendente");
  });
});

describe("página do Studio", () => {
  const params = Promise.resolve({ id: "abc" });
  it("marca respostas como vistas para o dono", async () => {
    guard.requirePageUser.mockResolvedValue({ id: "u-owner", role: "comercial" });
    await StudioPage({ params });
    expect(db.clientResponse.updateMany).toHaveBeenCalledWith({
      where: { previewId: "abc", seenAt: null },
      data: { seenAt: expect.any(Date) },
    });
  });
  it("aiStatus usa a IA do usuário logado, sem chaves", async () => {
    guard.requirePageUser.mockResolvedValue({ id: "admin", role: "admin" });
    ai.text.mockResolvedValue({ provider: "openai", apiKey: "sk-secret" });
    ai.image.mockResolvedValue({ provider: "openai", apiKey: "sk-secret" });
    const el = (await StudioPage({ params })) as { props: { aiStatus: unknown } };
    expect(ai.text).toHaveBeenCalledWith("admin");
    expect(el.props.aiStatus).toEqual({ text: true, image: "openai" });
  });
  it("proposta de outro usuário vira 404 e não marca nada", async () => {
    guard.requirePageUser.mockResolvedValue({ id: "outro", role: "comercial" });
    await expect(StudioPage({ params })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(db.clientResponse.updateMany).not.toHaveBeenCalled();
  });
});
