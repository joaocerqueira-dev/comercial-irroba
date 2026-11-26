import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  collectCaptureRefs,
  deletePreviewCaptures,
  legacyMirrorPrefix,
  mirrorFilePrefix,
  aiImageFilePrefix,
  legacyIdPrefixes,
  uploadFilePrefix,
} from "@/lib/files/captures";

let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "captures-test-"));
  await fs.mkdir(path.join(dir, ".thumbs"));
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

const touch = (name: string) => fs.writeFile(path.join(dir, name), "x");
const exists = (name: string) =>
  fs.access(path.join(dir, name)).then(
    () => true,
    () => false
  );

describe("deletePreviewCaptures", () => {
  const slugA = "loja-pralana-com-br-aaaaaa";
  const slugB = "loja-pralana-com-br-bbbbbb";

  it("novos espelhos usam o slug completo e não colidem", () => {
    expect(mirrorFilePrefix(slugA)).toBe(`m-${slugA}--`);
    expect(mirrorFilePrefix(slugB).startsWith(mirrorFilePrefix(slugA))).toBe(false);
    expect(legacyMirrorPrefix(slugA)).toBe(legacyMirrorPrefix(slugB));
  });

  it("apaga só arquivos exclusivos do preview", async () => {
    await touch(`${slugA}.png`);
    await touch(`${slugA}-full.jpg`);
    await touch(`${slugA}-mobile.png`);
    await touch(`${slugA}-mobile-full.jpg`);
    await touch(`${mirrorFilePrefix(slugA)}111.webp`);
    await touch(`${mirrorFilePrefix(slugB)}222.webp`);
    await touch(`${slugB}.png`);
    await touch("ai-previewAAA-1.png");
    await touch(`${uploadFilePrefix("previewAAAA")}999.png`);
    await touch(`${uploadFilePrefix("previewBBBB")}888.png`);
    await touch(`.thumbs/480-${mirrorFilePrefix(slugA)}111.webp.webp`);
    await touch(`.thumbs/480-${mirrorFilePrefix(slugB)}222.webp.webp`);

    await deletePreviewCaptures(slugA, "previewAAAA", { referencedElsewhere: new Set(), capturesDir: dir });

    expect(await exists(`${slugA}.png`)).toBe(false);
    expect(await exists(`${slugA}-full.jpg`)).toBe(false);
    expect(await exists(`${slugA}-mobile.png`)).toBe(false);
    expect(await exists(`${slugA}-mobile-full.jpg`)).toBe(false);
    expect(await exists(`${mirrorFilePrefix(slugA)}111.webp`)).toBe(false);
    expect(await exists("ai-previewAAA-1.png")).toBe(false);
    expect(await exists(`${uploadFilePrefix("previewAAAA")}999.png`)).toBe(false);
    expect(await exists(`${uploadFilePrefix("previewBBBB")}888.png`)).toBe(true);
    expect(await exists(`.thumbs/480-${mirrorFilePrefix(slugA)}111.webp.webp`)).toBe(false);
    expect(await exists(`${mirrorFilePrefix(slugB)}222.webp`)).toBe(true);
    expect(await exists(`${slugB}.png`)).toBe(true);
    expect(await exists(`.thumbs/480-${mirrorFilePrefix(slugB)}222.webp.webp`)).toBe(true);
  });

  it("espelhos antigos (prefixo curto) só saem se ninguém mais os citar", async () => {
    const shared = `${legacyMirrorPrefix(slugA)}abc123.jpg`;
    const orphan = `${legacyMirrorPrefix(slugA)}def456.jpg`;
    await touch(shared);
    await touch(orphan);
    const refs = collectCaptureRefs([{ products: [{ imageUrl: `/api/captures/${shared}` }] }, null]);
    expect(refs.has(shared)).toBe(true);

    await deletePreviewCaptures(slugA, "previewAAAA", { referencedElsewhere: refs, capturesDir: dir });
    expect(await exists(shared)).toBe(true);
    expect(await exists(orphan)).toBe(false);
  });

  it("sem lista de referências, mantém espelhos antigos", async () => {
    const legacy = `${legacyMirrorPrefix(slugA)}abc123.jpg`;
    await touch(legacy);
    await deletePreviewCaptures(slugA, "previewAAAA", { capturesDir: dir });
    expect(await exists(legacy)).toBe(true);
  });

  it("novos arquivos de IA/upload usam o id inteiro (CUIDs do mesmo instante não colidem)", () => {
    const a = "cmwnj9k410aaaaaaaaaaaaaaa";
    const b = "cmwnj9k410bbbbbbbbbbbbbbb";
    expect(aiImageFilePrefix(a)).toBe(`ai-${a}-`);
    expect(uploadFilePrefix(a)).toBe(`up-${a}-`);
    expect(aiImageFilePrefix(b).startsWith(aiImageFilePrefix(a))).toBe(false);
    expect(legacyIdPrefixes(a)).toEqual(legacyIdPrefixes(b));
  });

  it("prefixo antigo de 10 caracteres não apaga arquivo citado por outro preview", async () => {
    const a = "cmwnj9k410aaaaaaaaaaaaaaa";
    const b = "cmwnj9k410bbbbbbbbbbbbbbb";
    const sharedAi = "ai-cmwnj9k410-1795096879914-70eacc3b3e.png"; // do preview B
    const orphanAi = "ai-cmwnj9k410-1795097146146-6b7c13c2a5.png";
    const sharedUp = "up-cmwnj9k410-1795097165929-a603baff8f.png"; // do preview B
    const newB = `${aiImageFilePrefix(b)}1795106635723-9ba851118b.png`;
    const newA = `${aiImageFilePrefix(a)}1795106635724-aaaaaaaaaa.png`;
    for (const f of [sharedAi, orphanAi, sharedUp, newB, newA]) await touch(f);
    await touch(`.thumbs/480-${sharedAi}.webp`);

    const refs = collectCaptureRefs([
      { hero: { imageUrl: `/api/captures/${sharedAi}` }, logo: `/api/captures/${sharedUp}` },
    ]);
    await deletePreviewCaptures(slugA, a, { referencedElsewhere: refs, capturesDir: dir });

    expect(await exists(sharedAi)).toBe(true);
    expect(await exists(`.thumbs/480-${sharedAi}.webp`)).toBe(true);
    expect(await exists(sharedUp)).toBe(true);
    expect(await exists(newB)).toBe(true);
    expect(await exists(orphanAi)).toBe(false);
    expect(await exists(newA)).toBe(false);
  });

  it("sem lista de referências, mantém arquivos de IA/upload com prefixo antigo", async () => {
    const legacy = "ai-cmwnj9k410-1-abc.png";
    await touch(legacy);
    await deletePreviewCaptures(slugA, "cmwnj9k410aaaaaaaaaaaaaaa", { capturesDir: dir });
    expect(await exists(legacy)).toBe(true);
  });
});
