import { afterEach, describe, expect, it, vi } from "vitest";
import { AiKeyDecryptError, decryptApiKey, encryptApiKey } from "@/lib/ai/secret-box";

const A = "a".repeat(40);
const B = "b".repeat(40);

afterEach(() => vi.unstubAllEnvs());

describe("secret-box", () => {
  it("ida e volta devolve o texto", () => {
    vi.stubEnv("AI_KEYS_SECRET", A);
    const enc = encryptApiKey("sk-teste-1234");
    expect(enc.startsWith("v1:")).toBe(true);
    expect(enc).not.toContain("sk-teste");
    expect(decryptApiKey(enc)).toBe("sk-teste-1234");
  });

  it("IV aleatório: dois encrypt diferem", () => {
    vi.stubEnv("AI_KEYS_SECRET", A);
    expect(encryptApiKey("x")).not.toBe(encryptApiKey("x"));
  });

  it("ciphertext adulterado lança AiKeyDecryptError", () => {
    vi.stubEnv("AI_KEYS_SECRET", A);
    const [v, iv, tag, data] = encryptApiKey("segredo").split(":");
    const buf = Buffer.from(data, "base64");
    buf[0] ^= 1;
    expect(() => decryptApiKey([v, iv, tag, buf.toString("base64")].join(":"))).toThrow(AiKeyDecryptError);
    expect(() => decryptApiKey("lixo")).toThrow(AiKeyDecryptError);
  });

  it("segredo diferente lança AiKeyDecryptError", () => {
    vi.stubEnv("AI_KEYS_SECRET", A);
    const enc = encryptApiKey("segredo");
    vi.stubEnv("AI_KEYS_SECRET", B);
    expect(() => decryptApiKey(enc)).toThrow(AiKeyDecryptError);
  });

  it("produção sem segredo ou curto lança", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AI_KEYS_SECRET", "");
    expect(() => encryptApiKey("x")).toThrow();
    vi.stubEnv("AI_KEYS_SECRET", "curto");
    expect(() => encryptApiKey("x")).toThrow();
  });
});
