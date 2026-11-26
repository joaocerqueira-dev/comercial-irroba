import { afterEach, describe, expect, it, vi } from "vitest";
import { randomId } from "@/lib/client/randomId";
import { addCategory } from "@/components/studio/editors/CategoryAdder";
import { buildHeuristicBlueprint } from "@/lib/ai/architect";
import { makeSampleExtracted } from "@/lib/__tests__/fixtures";

afterEach(() => vi.unstubAllGlobals());

describe("randomId", () => {
  it("funciona sem crypto.randomUUID (HTTP fora de localhost)", () => {
    vi.stubGlobal("crypto", { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) });
    const a = randomId();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(randomId()).not.toBe(a);
  });

  it("funciona sem Web Crypto nenhum", () => {
    vi.stubGlobal("crypto", undefined);
    const a = randomId();
    expect(a.length).toBeGreaterThan(8);
    expect(randomId()).not.toBe(a);
  });

  it("addCategory não depende de randomUUID", () => {
    vi.stubGlobal("crypto", {});
    const bp = addCategory("Nova")(buildHeuristicBlueprint(makeSampleExtracted()));
    expect(bp.sections.categories.at(-1)?.href).toMatch(/^#cat-.+/);
  });
});
