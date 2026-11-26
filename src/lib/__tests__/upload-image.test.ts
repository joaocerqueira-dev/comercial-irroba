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
    expect(data.imageUrl).toMatch(/^\/api\/captures\/up-cmtestpreview123-.*\.png$/);
    expect(data.width).toBe(320);
    expect(data.height).toBe(180);

    const savedStat = await fs.stat(path.join(state.capturesDir, data.filename));
    expect(savedStat.size).toBeGreaterThan(50);
  });

  const upload = (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return POST(
      new NextRequest("http://localhost/api/previews/cmtestpreview123/upload-image", {
        method: "POST",
        body: form,
      }),
      { params: Promise.resolve({ id: "cmtestpreview123" }) }
    );
  };

  const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  it("rasteriza SVG para PNG (nunca grava .svg), ampliando no máximo 16x", async () => {
    const cleanSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="30" viewBox="0 0 100 30"><rect width="100" height="30" fill="#111"/></svg>`;
    const res = await upload(new File([cleanSvg], "logo.svg", { type: "image/svg+xml" }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { imageUrl: string; filename: string; width: number; height: number };
    expect(data.imageUrl).toMatch(/^\/api\/captures\/up-cmtestpreview123-.*\.png$/);
    // 100x30 a 72dpi; alvo de 2048px, mas a densidade para em 16x → 1600x480
    expect(data.width).toBe(1600);
    expect(data.height).toBe(480);
    const saved = await fs.readFile(path.join(state.capturesDir, data.filename));
    expect(saved.subarray(0, 8).equals(PNG_MAGIC)).toBe(true);
    const files = await fs.readdir(state.capturesDir);
    expect(files.some((f) => f.endsWith(".svg"))).toBe(false);
  });

  it("SVG com script/handlers vira PNG inerte (sem o markup original)", async () => {
    const xssSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" onload="alert(1)"><script>alert(1)</script><rect width="40" height="40" fill="red"/></svg>`;
    const res = await upload(new File([xssSvg], "evil.svg", { type: "image/svg+xml" }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { filename: string };
    expect(data.filename.endsWith(".png")).toBe(true);
    const saved = await fs.readFile(path.join(state.capturesDir, data.filename));
    expect(saved.subarray(0, 8).equals(PNG_MAGIC)).toBe(true);
    expect(saved.toString("latin1")).not.toContain("alert");
    expect((await sharp(saved).metadata()).format).toBe("png");
  });

  it("conteúdo SVG com nome/MIME de PNG também é rasterizado", async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20"/></svg>`;
    const res = await upload(new File([svg], "disfarce.png", { type: "image/png" }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { filename: string };
    expect(data.filename.endsWith(".png")).toBe(true);
    const saved = await fs.readFile(path.join(state.capturesDir, data.filename));
    expect(saved.subarray(0, 8).equals(PNG_MAGIC)).toBe(true);
  });

  it("rejeita SVG malformado ou com dimensões absurdas", async () => {
    const broken = await upload(new File(["<svg><nope"], "x.svg", { type: "image/svg+xml" }));
    expect(broken.status).toBe(400);
    const huge = `<svg xmlns="http://www.w3.org/2000/svg" width="10000000" height="10000000"><rect width="10" height="10"/></svg>`;
    const hugeRes = await upload(new File([huge], "huge.svg", { type: "image/svg+xml" }));
    if (hugeRes.status === 200) {
      // Se o librsvg aceitar, o resultado tem que respeitar o teto de dimensão
      const data = (await hugeRes.json()) as { width: number; height: number };
      expect(Math.max(data.width, data.height)).toBeLessThanOrEqual(3840);
    } else {
      expect(hugeRes.status).toBe(400);
    }
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
