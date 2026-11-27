import { describe, expect, it } from "vitest";
import { aiDisabledReason } from "../status";

describe("aiDisabledReason", () => {
  it("sem IA de texto", () => {
    expect(aiDisabledReason({ text: false, image: null }, "text")).toBe("Configure sua IA para gerar com IA");
    expect(aiDisabledReason({ text: true, image: null }, "text")).toBeNull();
  });
  it("sem IA de imagem", () => {
    expect(aiDisabledReason({ text: true, image: null }, "image")).toBe(
      "Configure sua IA de imagem para gerar imagens"
    );
    expect(aiDisabledReason({ text: true, image: "openai" }, "image")).toBeNull();
  });
  it("melhorar/redimensionar só com Google", () => {
    expect(aiDisabledReason({ text: true, image: "openai" }, "image-edit")).toBe(
      "Melhorar e redimensionar imagem funcionam só com IA de imagem Gemini."
    );
    expect(aiDisabledReason({ text: true, image: "google" }, "image-edit")).toBeNull();
    expect(aiDisabledReason({ text: true, image: null }, "image-edit")).toBe(
      "Configure sua IA de imagem para gerar imagens"
    );
  });
});
