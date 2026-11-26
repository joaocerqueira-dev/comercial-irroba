import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeSampleExtracted } from "./fixtures";

// Contrato com o SDK @google/genai (>= 1.x): ai.models.generateContent({ model, contents, config })
// e response.text como getter. Nenhuma chamada real é feita.
const generateContent = vi.fn();
const ctorArgs: unknown[] = [];

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
    constructor(opts: unknown) {
      ctorArgs.push(opts);
    }
  },
}));

describe("buildStoreBlueprint com @google/genai simulado", () => {
  const prevKey = process.env.GEMINI_API_KEY;
  const prevModel = process.env.GEMINI_MODEL;

  beforeEach(() => {
    generateContent.mockReset();
    ctorArgs.length = 0;
    process.env.GEMINI_API_KEY = "test-key";
    delete process.env.GEMINI_MODEL;
  });

  afterEach(() => {
    if (prevKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = prevKey;
    if (prevModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = prevModel;
  });

  it("chama generateContent com JSON mode e usa response.text", async () => {
    generateContent.mockResolvedValueOnce({
      text: JSON.stringify({ niche: "Calçados Veganos", tone: "minimal", primaryBackground: "#026526" }),
    });
    const { buildStoreBlueprint } = await import("@/lib/ai/architect");
    const result = await buildStoreBlueprint(makeSampleExtracted());

    expect(ctorArgs[0]).toEqual({ apiKey: "test-key" });
    expect(generateContent).toHaveBeenCalledTimes(1);
    const params = generateContent.mock.calls[0][0];
    expect(typeof params.model).toBe("string");
    expect(Array.isArray(params.contents)).toBe(true);
    expect(params.contents.at(-1)).toHaveProperty("text");
    expect(params.config.responseMimeType).toBe("application/json");
    expect(params.config.abortSignal).toBeInstanceOf(AbortSignal);
    expect(result.mode).toBe("gemini");
    expect(result.modelUsed).toBe(params.model);
  });

  it("cai para a heurística quando todos os modelos falham", async () => {
    generateContent.mockRejectedValue(new Error("503 UNAVAILABLE"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { buildStoreBlueprint } = await import("@/lib/ai/architect");
    const result = await buildStoreBlueprint(makeSampleExtracted());

    expect(result.mode).toBe("heuristic");
    expect(result.aiError).toMatch(/sobrecarregados/);
    warn.mockRestore();
    errSpy.mockRestore();
  });
});
