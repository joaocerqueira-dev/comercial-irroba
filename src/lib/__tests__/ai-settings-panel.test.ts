import { describe, expect, it } from "vitest";
import { canReuseTextKey } from "@/lib/ai/provider-defaults";

describe("canReuseTextKey", () => {
  it("só google e openai servem para imagem", () => {
    expect(canReuseTextKey({ provider: "google" })).toBe(true);
    expect(canReuseTextKey({ provider: "openai" })).toBe(true);
    expect(canReuseTextKey({ provider: "anthropic" })).toBe(false);
    expect(canReuseTextKey({ provider: "openai-compatible" })).toBe(false);
    expect(canReuseTextKey(null)).toBe(false);
  });
});
