import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { prisma } from "@/lib/db";
import { assertPublicHttpUrl } from "@/lib/net/safe-url";
import { decryptApiKey } from "./secret-box";

import { DEFAULT_IMAGE_MODELS, DEFAULT_TEXT_MODELS, type AiProvider, type AiPurpose } from "./provider-defaults";

export { DEFAULT_IMAGE_MODELS, DEFAULT_TEXT_MODELS, IMAGE_PROVIDERS } from "./provider-defaults";
export type { AiProvider, AiPurpose } from "./provider-defaults";

export interface UserTextAi {
  provider: AiProvider;
  modelId: string;
  model: LanguageModel;
  supportsImageInput: boolean;
}
export interface UserImageAi {
  provider: "google" | "openai";
  modelId: string;
  apiKey: string;
}

export function buildTextModel(cred: {
  provider: AiProvider;
  apiKey: string;
  model?: string | null;
  baseUrl?: string | null;
}): UserTextAi {
  const { provider, apiKey } = cred;
  const modelId = cred.model?.trim() || DEFAULT_TEXT_MODELS[provider];
  if (!modelId) throw new Error("Informe o modelo para o provedor compatível com OpenAI.");
  const model =
    provider === "openai"
      ? createOpenAI({ apiKey })(modelId)
      : provider === "anthropic"
        ? createAnthropic({ apiKey })(modelId)
        : provider === "google"
          ? createGoogleGenerativeAI({ apiKey })(modelId)
          : createOpenAI({ apiKey, baseURL: cred.baseUrl ?? undefined }).chat(modelId);
  return { provider, modelId, model, supportsImageInput: provider !== "openai-compatible" };
}

// Linha da credencial → chave em claro; null se não existe ou não decifra (segredo trocado).
async function load(userId: string, purpose: AiPurpose) {
  const row = await prisma.aiCredential.findUnique({ where: { userId_purpose: { userId, purpose } } });
  if (!row) return null;
  try {
    return { row, apiKey: decryptApiKey(row.apiKeyEncrypted) };
  } catch {
    console.warn(`[ia] não foi possível decifrar a credencial de ${purpose} (usuário ${userId}); salve a chave de novo.`);
    return null;
  }
}

export async function getUserTextAi(userId: string): Promise<UserTextAi | null> {
  const c = await load(userId, "texto");
  if (!c) return null;
  const provider = c.row.provider as AiProvider;
  try {
    if (provider === "openai-compatible") await assertPublicHttpUrl(c.row.baseUrl ?? "");
    return buildTextModel({ provider, apiKey: c.apiKey, model: c.row.model, baseUrl: c.row.baseUrl });
  } catch {
    console.warn("[ia] credencial de texto inválida ou com endereço inseguro; tratada como não configurada.");
    return null;
  }
}

export async function getUserImageAi(userId: string): Promise<UserImageAi | null> {
  const c = await load(userId, "imagem");
  if (!c) return null;
  const provider = c.row.provider;
  if (provider !== "google" && provider !== "openai") return null;
  return { provider, modelId: c.row.model?.trim() || DEFAULT_IMAGE_MODELS[provider], apiKey: c.apiKey };
}
