import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ aiCredential: { findUnique: vi.fn() } }));
vi.mock("@/lib/db", () => ({ prisma: db }));

import { buildTextModel, getUserImageAi, getUserTextAi, DEFAULT_TEXT_MODELS } from "@/lib/ai/providers";
import { encryptApiKey } from "@/lib/ai/secret-box";

const A = "a".repeat(40);
const B = "b".repeat(40);

beforeEach(() => {
  vi.stubEnv("AI_KEYS_SECRET", A);
  db.aiCredential.findUnique.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.unstubAllEnvs());

describe("buildTextModel", () => {
  it("usa o modelo padrão quando vazio", () => {
    for (const p of ["openai", "anthropic", "google"] as const) {
      const r = buildTextModel({ provider: p, apiKey: "k", model: "" });
      expect(r.modelId).toBe(DEFAULT_TEXT_MODELS[p]);
      expect(r.provider).toBe(p);
      expect(r.model).toBeDefined();
      expect(r.supportsImageInput).toBe(true);
    }
  });
  it("openai-compatible exige modelo e não aceita imagem", () => {
    expect(() => buildTextModel({ provider: "openai-compatible", apiKey: "k", baseUrl: "https://x.com/v1" })).toThrow();
    const r = buildTextModel({ provider: "openai-compatible", apiKey: "k", baseUrl: "https://x.com/v1", model: "m" });
    expect(r.modelId).toBe("m");
    expect(r.supportsImageInput).toBe(false);
  });
});

describe("getUserTextAi / getUserImageAi", () => {
  const row = (over: object) => ({ provider: "openai", model: null, baseUrl: null, apiKeyEncrypted: encryptApiKey("sk-1234"), ...over });

  it("sem registro → null", async () => {
    db.aiCredential.findUnique.mockResolvedValue(null);
    expect(await getUserTextAi("u")).toBeNull();
    expect(await getUserImageAi("u")).toBeNull();
  });
  it("credencial cifrada por outro segredo → null", async () => {
    const r = row({});
    vi.stubEnv("AI_KEYS_SECRET", B);
    db.aiCredential.findUnique.mockResolvedValue(r);
    expect(await getUserTextAi("u")).toBeNull();
  });
  it("baseUrl interna → null", async () => {
    db.aiCredential.findUnique.mockResolvedValue(
      row({ provider: "openai-compatible", model: "m", baseUrl: "https://127.0.0.1/v1" }),
    );
    expect(await getUserTextAi("u")).toBeNull();
  });
  it("texto válido", async () => {
    db.aiCredential.findUnique.mockResolvedValue(row({}));
    const r = await getUserTextAi("u");
    expect(r?.modelId).toBe("gpt-5.4-mini");
  });
  it("imagem devolve apiKey decifrada e modelo padrão", async () => {
    db.aiCredential.findUnique.mockResolvedValue(row({ provider: "google" }));
    expect(await getUserImageAi("u")).toEqual({ provider: "google", modelId: "gemini-3.1-flash-image", apiKey: "sk-1234" });
  });
});
