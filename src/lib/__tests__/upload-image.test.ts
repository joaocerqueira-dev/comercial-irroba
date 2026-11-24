import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  capturesDir: "",
  findUnique: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    storePreview: {
      findUnique: state.findUnique,
    },
  },
}));

vi.mock("@/lib/files/captures", async (orig) => {
  const actual = await orig<typeof import("@/lib/files/captures")>();
  return {
    ...actual,
    get CAPTURES_DIR() {
      return state.capturesDir;
    },
  };
});

import { POST } from "@/app/api/previews/[id]/upload-image/route";

beforeEach(async () => {
  state.capturesDir = await fs.mkdtemp(path.join(os.tmpdir(), "upload-test-"));
  state.findUnique.mockReset();
  state.findUnique.mockResolvedValue({ id: "cmtestpreview123" });
});

afterEach(async () => {
  if (state.capturesDir) {
    await fs.rm(state.capturesDir, { recursive: true, force: true });
  }
});

describe("POST /api/previews/[id]/upload-image", () => {
  it("salva imagem PNG enviada do computador e retorna URL pública e dimensões", async () => {
    const pngBuf = await sharp({
      create: {
        width: 320,
        height: 180,
        channels: 4,
        background: { r: 16, g: 185, b: 129, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const form = new FormData();
    form.append("file", new File([pngBuf], "banner-pc.png", { type: "image/png" }));

    const req = new NextRequest("http://localhost/api/previews/cmtestpreview123/upload-image", {
      method: "POST",
      body: form,
    });

    const res = await POST(req, { params: Promise.resolve({ id: "cmtestpreview123" }) });
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      imageUrl: string;
      width: number;
      height: number;
      filename: string;
    };
    expect(data.imageUrl).toMatch(/^\/api\/captures\/up-cmtestprev-.*\.png$/);
    expect(data.width).toBe(320);
    expect(data.height).toBe(180);

    const savedStat = await fs.stat(path.join(state.capturesDir, data.filename));
    expect(savedStat.size).toBeGreaterThan(50);
  });

  it("aceita SVG limpo para logotipo e bloqueia SVG com script/handlers", async () => {
    const cleanSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 30"><rect width="100" height="30" fill="#111"/></svg>`;
    const okForm = new FormData();
    okForm.append("file", new File([cleanSvg], "logo.svg", { type: "image/svg+xml" }));

    const okRes = await POST(
      new NextRequest("http://localhost/api/previews/cmtestpreview123/upload-image", {
        method: "POST",
        body: okForm,
      }),
      { params: Promise.resolve({ id: "cmtestpreview123" }) }
    );
    expect(okRes.status).toBe(200);

    const xssSvg = `<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script></svg>`;
    const badForm = new FormData();
    badForm.append("file", new File([xssSvg], "evil.svg", { type: "image/svg+xml" }));

    const badRes = await POST(
      new NextRequest("http://localhost/api/previews/cmtestpreview123/upload-image", {
        method: "POST",
        body: badForm,
      }),
      { params: Promise.resolve({ id: "cmtestpreview123" }) }
    );
    expect(badRes.status).toBe(400);
  });

  it("retorna 404 quando o preview não existe", async () => {
    state.findUnique.mockResolvedValueOnce(null);
    const form = new FormData();
    form.append("file", new File(["abc"], "x.png", { type: "image/png" }));

    const res = await POST(
      new NextRequest("http://localhost/api/previews/inexistente/upload-image", {
        method: "POST",
        body: form,
      }),
      { params: Promise.resolve({ id: "inexistente" }) }
    );
    expect(res.status).toBe(404);
  });
});
