import { describe, expect, it } from "vitest";
import { buildHeuristicBlueprint } from "@/lib/ai/architect";
import { computeUnsaved, deepEqual, type StudioSaveSnapshot } from "@/lib/client/unsavedChanges";
import { makeSampleExtracted } from "@/lib/__tests__/fixtures";

function snapshot(): StudioSaveSnapshot {
  return {
    bp: buildHeuristicBlueprint(makeSampleExtracted()),
    sellerWhatsapp: "5511999999999",
    currentMode: "heuristic",
  };
}

describe("deepEqual", () => {
  it("compara estrutura, ignorando ordem de chaves e chaves undefined", () => {
    expect(deepEqual({ a: 1, b: [1, { c: "x" }] }, { b: [1, { c: "x" }], a: 1 })).toBe(true);
    expect(deepEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
    expect(deepEqual({ a: [1, 2] }, { a: [2, 1] })).toBe(false);
    expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false);
    expect(deepEqual(null, {})).toBe(false);
  });
});

describe("computeUnsaved (save com edição concorrente)", () => {
  it("sem edições durante o save, fica salvo", () => {
    const sent = snapshot();
    expect(computeUnsaved(sent, sent)).toBe(false);
    // cópia estrutural idêntica também conta como salva
    expect(computeUnsaved(structuredClone(sent), sent)).toBe(false);
  });

  it("edição no blueprint durante a requisição continua pendente", () => {
    const sent = snapshot();
    const current: StudioSaveSnapshot = {
      ...sent,
      bp: { ...sent.bp, sections: { ...sent.bp.sections, announcementText: "editado durante o save" } },
    };
    expect(computeUnsaved(current, sent)).toBe(true);
  });

  it("considera também whatsapp e modo, não só o blueprint", () => {
    const sent = snapshot();
    expect(computeUnsaved({ ...sent, sellerWhatsapp: "5511888888888" }, sent)).toBe(true);
    expect(computeUnsaved({ ...sent, currentMode: "gemini" }, sent)).toBe(true);
  });
});
