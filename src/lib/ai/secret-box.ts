import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export class AiKeysSecretMissingError extends Error {
  constructor() {
    super("AI_KEYS_SECRET ausente ou com menos de 32 caracteres (obrigatório em produção).");
  }
}

export class AiKeyDecryptError extends Error {
  constructor() {
    super("Não foi possível decifrar a chave de IA salva.");
  }
}

const DEV_SECRET = "dev-ai-keys-secret-dev-ai-keys-secret";
let warned = false;

function getSecret(): string {
  const s = process.env.AI_KEYS_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!s || s.length < 32) throw new AiKeysSecretMissingError();
    return s;
  }
  if (s && s.length >= 32) return s;
  if (!warned) {
    warned = true;
    console.warn("[ia] AI_KEYS_SECRET ausente: usando segredo de desenvolvimento.");
  }
  return DEV_SECRET;
}

const key = () => createHash("sha256").update(getSecret()).digest();

export function encryptApiKey(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), data.toString("base64")].join(":");
}

export function decryptApiKey(enc: string): string {
  try {
    const [v, iv, tag, data, extra] = enc.split(":");
    if (v !== "v1" || !iv || !tag || !data || extra !== undefined) throw new Error();
    const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
    d.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()]).toString("utf8");
  } catch (e) {
    if (e instanceof AiKeysSecretMissingError) throw e;
    throw new AiKeyDecryptError();
  }
}
