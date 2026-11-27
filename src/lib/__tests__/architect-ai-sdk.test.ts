import fs from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { LanguageModel } from "ai";
import { makeSampleExtracted } from "./fixtures";
import type { UserTextAi } from "@/lib/ai/providers";

// Contrato com o AI SDK: uma única chamada generateText({ model, messages, temperature, abortSignal }) → .text
const sdk = vi.hoisted(() => ({ generateText: vi.fn() }));
vi.mock("ai", async (orig) => ({ ...(await orig<typeof import("ai")>()), generateText: sdk.generateText }));

import { buildStoreBlueprint } from "@/lib/ai/architect";
import { isAiMode } from "@/lib/ai/mode";

const model = { modelId: "fake" } as unknown as LanguageModel;
const userAi = (supportsImageInput = true): UserTextAi => ({ provider: "openai", modelId: "gpt-x", model, supportsImageInput });
const shot = path.join(process.cwd(), "public", "captures", "test-architect-ai-sdk.png");
const extracted = () => makeSampleExtracted({ screenshotPath: "/captures/test-architect-ai-sdk.png" });
const ok = JSON.stringify({ niche: "Calçados Veganos", tone: "minimal", primaryBackground: "#026526" });
type Part = { type: string };
const parts = () => (sdk.generateText.mock.calls[0][0].messages[0].content as Part[]).map((p) => p.type);

beforeAll(async () => {
  await fs.mkdir(path.dirname(shot), { recursive: true });
  await fs.writeFile(shot, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
});
afterAll(() => fs.rm(shot, { force: true }));
beforeEach(() => {
  sdk.generateText.mockReset();
});

describe("buildStoreBlueprint com a IA do usuário", () => {
  it("sem IA configurada: heurístico com aviso ai-not-configured e nenhuma chamada", async () => {
    const result = await buildStoreBlueprint(extracted());
    expect(result.mode).toBe("heuristic");
    const notice = result.blueprint.designInsights?.find((i) => i.id === "ai-not-configured");
    expect(notice?.title).toBe("Configure sua IA para gerar com IA");
    expect(sdk.generateText).not.toHaveBeenCalled();
  });

  it("uma chamada no modelo do usuário, com imagem quando suportada", async () => {
    sdk.generateText.mockResolvedValueOnce({ text: ok });
    const result = await buildStoreBlueprint(extracted(), { ai: userAi(true) });
    expect(sdk.generateText).toHaveBeenCalledTimes(1);
    const args = sdk.generateText.mock.calls[0][0];
    expect(args.model).toBe(model);
    expect(args.temperature).toBe(0.25);
    expect(args.abortSignal).toBeInstanceOf(AbortSignal);
    expect(parts()).toEqual(["image", "text"]);
    expect(args.messages[0].content[0].image).toBeInstanceOf(Buffer);
    expect(args.messages[0].content[0].mediaType).toBe("image/png");
    expect(result.mode).toBe("ai");
    expect(result.modelUsed).toBe("gpt-x");
    expect(result.aiProvider).toBe("openai");
    expect(result.blueprint.brand.niche).toBe("Calçados Veganos");
  });

  it("provedor sem imagem na entrada: só texto", async () => {
    sdk.generateText.mockResolvedValueOnce({ text: ok });
    await buildStoreBlueprint(extracted(), { ai: userAi(false) });
    expect(parts()).toEqual(["text"]);
  });

  it("aceita resposta com cercas ```json", async () => {
    sdk.generateText.mockResolvedValueOnce({ text: "```json\n" + ok + "\n```" });
    expect((await buildStoreBlueprint(extracted(), { ai: userAi() })).mode).toBe("ai");
  });

  it("429: heurístico com a mensagem fixa e sem segunda chamada", async () => {
    sdk.generateText.mockRejectedValue({ statusCode: 429 });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const result = await buildStoreBlueprint(extracted(), { ai: userAi() });
    expect(sdk.generateText).toHaveBeenCalledTimes(1);
    expect(result.mode).toBe("heuristic");
    expect(result.aiError).toBe("Limite de uso da sua IA atingido. Tente de novo em instantes.");
    const notice = result.blueprint.designInsights?.[0];
    expect(notice?.title).toBe("Fallback heurístico ativado (IA indisponível)");
    expect(notice?.description).toContain("Reanalisar identidade com IA");
    expect(JSON.stringify(result.blueprint.designInsights)).not.toMatch(/Gemini/);
    warn.mockRestore();
  });
});

describe("isAiMode", () => {
  it("ai e gemini (legado) são IA", () => {
    expect(isAiMode("ai")).toBe(true);
    expect(isAiMode("gemini")).toBe(true);
    expect(isAiMode("heuristic")).toBe(false);
    expect(isAiMode(null)).toBe(false);
    expect(isAiMode(undefined)).toBe(false);
  });
});
