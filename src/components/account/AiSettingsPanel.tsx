"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Field } from "@/components/ui/Field";
import {
  DEFAULT_IMAGE_MODELS,
  DEFAULT_TEXT_MODELS,
  canReuseTextKey,
  type AiProvider,
  type AiPurpose,
} from "@/lib/ai/provider-defaults";

interface View {
  provider: AiProvider;
  model: string | null;
  baseUrl: string | null;
  last4: string;
  broken?: true;
}
type Msg = { ok: boolean; text: string } | null;

const input = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900";
const label = "block text-sm font-medium text-slate-700";
const btn = "rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold hover:bg-slate-50 disabled:opacity-60";

const TEXT_PROVIDERS: [AiProvider, string][] = [
  ["openai", "ChatGPT (OpenAI)"],
  ["anthropic", "Claude (Anthropic)"],
  ["google", "Gemini (Google)"],
  ["openai-compatible", "Outra compatível com OpenAI"],
];
const IMAGE_PROVIDER_OPTIONS: [AiProvider, string][] = [
  ["google", "Gemini (Google)"],
  ["openai", "OpenAI"],
];

function Card({
  purpose,
  title,
  hint,
  providers,
  current,
  textView,
  onChange,
  children,
}: {
  purpose: AiPurpose;
  title: string;
  hint: string;
  providers: [AiProvider, string][];
  current: View | null;
  textView: View | null;
  onChange: () => Promise<void>;
  children?: React.ReactNode;
}) {
  const [provider, setProvider] = useState<AiProvider>(current?.provider ?? providers[0][0]);
  const [model, setModel] = useState(current?.model ?? "");
  const [baseUrl, setBaseUrl] = useState(current?.baseUrl ?? "");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const defaults: Record<string, string | null> = purpose === "texto" ? DEFAULT_TEXT_MODELS : DEFAULT_IMAGE_MODELS;
  const saved = current && current.provider === provider ? current : null;

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true);
    setMsg(null);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    return { res, data };
  }

  async function save(e: FormEvent, extra?: { reuseText: true }) {
    e.preventDefault();
    const { res, data } = await call("/api/me/ai", "PUT", {
      purpose,
      provider,
      model: model.trim() || undefined,
      baseUrl: provider === "openai-compatible" ? baseUrl.trim() : undefined,
      apiKey: extra ? undefined : apiKey.trim() || undefined,
      ...extra,
    });
    if (!res?.ok) return setMsg({ ok: false, text: data?.error ?? "Não foi possível salvar." });
    setApiKey("");
    await onChange();
    setMsg({ ok: true, text: "Salvo." });
  }

  async function test() {
    const { data } = await call("/api/me/ai/test", "POST", { purpose });
    setMsg(
      data?.ok
        ? { ok: true, text: `Conexão ok (${data.model}).` }
        : { ok: false, text: data?.error ?? "Não foi possível falar com a sua IA." },
    );
  }

  async function remove() {
    const { res, data } = await call(`/api/me/ai?purpose=${purpose}`, "DELETE");
    if (!res?.ok) return setMsg({ ok: false, text: data?.error ?? "Não foi possível remover." });
    setModel("");
    setBaseUrl("");
    await onChange();
    setMsg({ ok: true, text: "Removida." });
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mb-3 text-sm text-slate-600">{hint}</p>
      {current?.broken && (
        <p role="alert" className="mb-3 text-sm text-amber-700">
          Não foi possível ler a chave salva. Salve a chave de novo.
        </p>
      )}
      <form onSubmit={save} className="space-y-3">
        <Field label="Provedor" labelClassName={label}>
          <select value={provider} onChange={(e) => setProvider(e.target.value as AiProvider)} className={input}>
            {providers.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label={saved ? "Chave da API (deixe em branco para manter)" : "Chave da API"}
          labelClassName={label}
        >
          <input
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={saved ? `••••${saved.last4}` : ""}
            className={input}
          />
        </Field>
        <Field label="Modelo" labelClassName={label}>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={defaults[provider] ?? "Obrigatório"}
            className={input}
          />
        </Field>
        {provider === "openai-compatible" && (
          <Field label="URL base (https)" labelClassName={label}>
            <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.exemplo.com/v1" className={input} />
          </Field>
        )}
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>
            {msg.text}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {busy ? "Aguarde..." : "Salvar"}
          </button>
          <button type="button" disabled={busy || !current} onClick={test} className={btn}>
            Testar conexão
          </button>
          <button type="button" disabled={busy || !current} onClick={remove} className={btn}>
            Remover
          </button>
          {purpose === "imagem" && canReuseTextKey(textView) && (
            <button
              type="button"
              disabled={busy}
              onClick={(e) => {
                setProvider(textView!.provider);
                void save(e, { reuseText: true });
              }}
              className={btn}
            >
              Usar a mesma chave da IA de texto
            </button>
          )}
        </div>
      </form>
      {children}
    </section>
  );
}

export function AiSettingsPanel() {
  const [data, setData] = useState<{ texto: View | null; imagem: View | null } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/me/ai").catch(() => null);
    const json = await res?.json().catch(() => null);
    if (res?.ok) setData(json);
    else setError(json?.error ?? "Não foi possível carregar suas configurações.");
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <p role="alert" className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Carregando...</p>;

  return (
    <div className="space-y-4">
      <Card
        purpose="texto"
        title="IA de texto"
        hint="Gera o layout e o editor HTML com IA."
        providers={TEXT_PROVIDERS}
        current={data.texto}
        textView={data.texto}
        onChange={load}
      />
      <Card
        purpose="imagem"
        title="IA de imagem (opcional)"
        hint="Gera imagens para as propostas."
        providers={IMAGE_PROVIDER_OPTIONS}
        current={data.imagem}
        textView={data.texto}
        onChange={load}
      >
        <p className="mt-3 text-xs text-slate-500">
          O Claude não gera imagens; quem usa Claude precisa de uma chave de imagem separada.
        </p>
        <p className="mt-1 text-xs text-slate-500">Melhorar e redimensionar imagem funcionam só com Gemini.</p>
      </Card>
    </div>
  );
}
