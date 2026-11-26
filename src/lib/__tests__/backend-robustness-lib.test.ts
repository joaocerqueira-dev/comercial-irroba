import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { StoreBlueprintSchema } from "@/lib/types/blueprint";
import { buildHeuristicBlueprint } from "@/lib/ai/architect";
import { applyCapturesGc, collectRefs, planCapturesGc } from "../../../scripts/captures-gc.mjs";
import { makeSampleExtracted } from "./fixtures";

describe("blueprint: URLs de imagem", () => {
  const bp = buildHeuristicBlueprint(makeSampleExtracted());
  it("aceita http(s), /api/captures e vazio; recusa data: e URL acima de 4096", () => {
    expect(StoreBlueprintSchema.safeParse(bp).success).toBe(true);
    const local = structuredClone(bp);
    local.sections.hero.imageUrl = "/api/captures/up-abc-1.png";
    expect(StoreBlueprintSchema.safeParse(local).success).toBe(true);
    const data = structuredClone(bp);
    data.products[0].imageUrl = "  DATA:image/svg+xml,<svg onload=alert(1)>";
    expect(StoreBlueprintSchema.safeParse(data).success).toBe(false);
    const long = structuredClone(bp);
    long.sections.hero.imageUrl = `https://a.com/${"x".repeat(4096)}`;
    expect(StoreBlueprintSchema.safeParse(long).success).toBe(false);
  });
});

describe("captures:gc", () => {
  let dir: string;
  const old = Date.now() - 3 * 60 * 60 * 1000;
  const touch = async (name: string, mtime = old) => {
    const file = path.join(dir, name);
    await fs.writeFile(file, "x");
    await fs.utimes(file, mtime / 1000, mtime / 1000);
  };
  const exists = (name: string) =>
    fs.access(path.join(dir, name)).then(
      () => true,
      () => false
    );

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "captures-gc-"));
    await fs.mkdir(path.join(dir, ".thumbs"));
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("dry-run lista órfãos sem apagar e respeita prefixos, referências e idade", async () => {
    const preview = { id: "cmabc1234500000xyz", slug: "loja-viva-com-br-aaaaaa" };
    await touch(`${preview.slug}.png`); // screenshot do preview existente
    await touch(`m-${preview.slug}--1.webp`); // espelho atual
    await touch(`ai-${preview.id}-1-aa.png`); // IA atual
    await touch("ai-cmabc12345-2-bb.png"); // IA antiga (prefixo curto do mesmo preview)
    await touch("m-outra-loja-com-br-x-ref.jpg"); // citada pelo blueprint
    await touch("loja-apagada-com-br-bbbbbb.png"); // órfão
    await touch("up-cmzzz00000000000000-9-cc.png"); // órfão
    await touch("loja-recente-com-br-cccccc.png", Date.now()); // órfão, mas recente
    await touch(".thumbs/480-loja-apagada-com-br-bbbbbb.png.webp"); // miniatura de órfão
    await touch(`.thumbs/480-${preview.slug}.png.webp`); // miniatura válida

    const referenced = collectRefs([{ hero: { imageUrl: "/api/captures/m-outra-loja-com-br-x-ref.jpg" } }]);
    const plan = await planCapturesGc({ capturesDir: dir, previews: [preview], referenced });
    expect([...plan.orphans].sort()).toEqual(
      [".thumbs/480-loja-apagada-com-br-bbbbbb.png.webp", "loja-apagada-com-br-bbbbbb.png", "up-cmzzz00000000000000-9-cc.png"].sort()
    );
    // dry-run: nada foi apagado
    expect(await exists("loja-apagada-com-br-bbbbbb.png")).toBe(true);

    expect(await applyCapturesGc(dir, plan.orphans)).toBe(3);
    expect(await exists("loja-apagada-com-br-bbbbbb.png")).toBe(false);
    expect(await exists(`${preview.slug}.png`)).toBe(true);
    expect(await exists("ai-cmabc12345-2-bb.png")).toBe(true);
    expect(await exists("loja-recente-com-br-cccccc.png")).toBe(true);
    expect(await exists(`.thumbs/480-${preview.slug}.png.webp`)).toBe(true);
  });
});
