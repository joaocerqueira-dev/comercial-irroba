import { describe, expect, it } from "vitest";
import { describeAiError } from "@/lib/ai/errors";

const AUTH = "Chave da sua IA inválida ou sem permissão. Confira em Minha IA.";
const MONEY = "Sua conta de IA está sem saldo ou créditos.";
const LIMIT = "Limite de uso da sua IA atingido. Tente de novo em instantes.";
const DOWN = "O provedor da sua IA está instável no momento. Tente de novo.";
const SLOW = "A IA demorou demais para responder.";
const OTHER = "Não foi possível falar com a sua IA.";

describe("describeAiError", () => {
  it.each<[string, unknown, string]>([
    ["401", { statusCode: 401 }, AUTH],
    ["403", { status: 403 }, AUTH],
    ["402", { statusCode: 402 }, MONEY],
    ["insufficient_quota", new Error("You exceeded: insufficient_quota"), MONEY],
    ["429", { statusCode: 429 }, LIMIT],
    ["RESOURCE_EXHAUSTED", new Error("RESOURCE_EXHAUSTED"), LIMIT],
    ["503", { statusCode: 503 }, DOWN],
    ["overloaded", new Error("Overloaded"), DOWN],
    ["timeout", Object.assign(new Error("x"), { name: "TimeoutError" }), SLOW],
    ["desconhecido", new Error("boom"), OTHER],
  ])("%s", (_n, err, msg) => expect(describeAiError(err)).toBe(msg));

  it("nunca devolve o texto cru nem a chave", () => {
    const out = describeAiError(new Error("Incorrect API key provided: sk-proj-ABCDEF1234567890"));
    expect(out).not.toContain("sk-proj-ABCDEF1234567890");
    expect(out).toBe(AUTH);
  });
});
