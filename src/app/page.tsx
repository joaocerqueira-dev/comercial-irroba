"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatWhatsapp, hostnameOf, isValidWhatsapp, normalizeStoreUrl, pluralize } from "@/lib/format/inputs";
import { readEventStream } from "@/lib/sse/readEventStream";
import { copyToClipboard } from "@/lib/client/clipboard";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";

interface PreviewSummary {
  id: string;
  slug: string;
  sourceUrl: string;
  detectedPlatform: string | null;
  storeName: string;
  generationMode: string;
  status: string;
  screenshotPath: string | null;
  createdAt: string;
}

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [sellerWhatsapp, setSellerWhatsapp] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<PreviewSummary[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [touched, setTouched] = useState({ url: false, whatsapp: false });
  const normalizedUrl = normalizeStoreUrl(url);
  const urlError = url.trim() && !normalizedUrl ? "Informe um domínio válido, ex: loja.com.br" : null;
  const whatsappError = !isValidWhatsapp(sellerWhatsapp) ? "Use 55 + DDD + número, ex: +55 (11) 99999-9999" : null;
  const canSubmit = Boolean(normalizedUrl) && !whatsappError && !isGenerating;
  const groups = useMemo(() => {
    const map = new Map<string, PreviewSummary[]>();
    for (const p of previews) {
      const key = hostnameOf(p.sourceUrl);
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    return [...map.values()];
  }, [previews]);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const urlId = useId();
  const waId = useId();

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  const loadPreviews = async () => {
    try {
      const res = await fetch("/api/previews");
      if (res.ok) {
        const data = (await res.json()) as { previews: PreviewSummary[] };
        setPreviews(data.previews);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    loadPreviews();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ url: true, whatsapp: true });
    if (!canSubmit || !normalizedUrl) return;

    setIsGenerating(true);
    setProgress(10);
    setStatusMessage("Conectando ao site do cliente...");
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/previews/generate", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl, sellerWhatsapp: sellerWhatsapp.replace(/\D/g, "") }),
      });

      if (!response.ok || !response.body) {
        const errData = await response.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error || "Erro ao iniciar geração");
      }

      await readEventStream(response.body, async ({ event: eventName, data: payload }) => {
        if (eventName === "progress") {
          setProgress(Number(payload.progress ?? 50));
          setStatusMessage(String(payload.message ?? "Processando..."));
        } else if (eventName === "done") {
          setProgress(100);
          setStatusMessage("Preview gerado com sucesso!");
          await loadPreviews();
          router.push(`/studio/${String(payload.id)}`);
          return true;
        } else if (eventName === "error") {
          throw new Error(String(payload.message ?? "Falha na extração da loja"));
        }
      });
    } catch (err) {
      if (controller.signal.aborted) {
        setError("Geração cancelada.");
      } else {
        setError(err instanceof Error ? err.message : "Erro ao gerar preview");
      }
      setIsGenerating(false);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const handleCopyClientLink = async (slug: string) => {
    const shareUrl = `${window.location.origin}/preview/${slug}`;
    if (!(await copyToClipboard(shareUrl))) {
      window.prompt("Copie o link do cliente:", shareUrl);
      return;
    }
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este preview?")) return;
    try {
      const res = await fetch(`/api/previews/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `Falha ao excluir (HTTP ${res.status})`);
      }
      setPreviews((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir preview");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-50">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 font-bold text-slate-950">
              IR
            </div>
            <div>
              <div className="text-sm font-bold text-white">Irroba Preview AI</div>
              <div className="text-xs text-slate-400">
                Gerador Comercial de Lojas Beta · Padrão Tema LIME
              </div>
            </div>
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            Uso Interno Comercial
          </span>
        </div>
      </header>

      {/* Hero / Generator Form */}
      <section className="mx-auto max-w-4xl px-6 pb-14 pt-12 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3.5 py-1 text-xs font-medium text-emerald-300">
          <Sparkles className="h-3.5 w-3.5" />
          Transforme qualquer concorrente em uma prévia na Irroba em segundos
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Mostre ao cliente como a loja dele ficaria na Irroba antes mesmo de fechar
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
          Cole a URL atual do prospect (Nuvemshop, Tray, Loja Integrada, Shopify, WooCommerce). A
          ferramenta extrai logo, cores, categorias e produtos e gera um link interativo + blocos
          prontos para o Tema LIME.
        </p>

        <form
          onSubmit={handleGenerate}
          className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-left shadow-2xl backdrop-blur sm:p-6"
        >
          <div className="grid items-end gap-3 sm:grid-cols-12">
            <div className="sm:col-span-6">
              <label htmlFor={urlId} className="mb-1.5 block truncate text-xs font-medium text-slate-300">
                URL do e-commerce atual do cliente
              </label>
              <div className="relative">
                <Globe className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  id={urlId}
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, url: true }))}
                  aria-invalid={Boolean(touched.url && urlError)}
                  aria-describedby={touched.url && urlError ? `${urlId}-err` : undefined}
                  placeholder="Ex: estiloveggieshoes.com.br"
                  disabled={isGenerating}
                  className="w-full rounded-xl border border-white/15 bg-slate-900/90 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                />
              </div>
              {touched.url && urlError && (
                <p id={`${urlId}-err`} className="mt-1 text-xs text-rose-300">
                  {urlError}
                </p>
              )}
            </div>

            <div className="sm:col-span-3">
              <label htmlFor={waId} className="mb-1.5 block truncate text-xs font-medium text-slate-300">
                WhatsApp do consultor (opcional)
              </label>
              <input
                id={waId}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={sellerWhatsapp}
                onChange={(e) => setSellerWhatsapp(formatWhatsapp(e.target.value))}
                onBlur={() => setTouched((t) => ({ ...t, whatsapp: true }))}
                aria-invalid={Boolean(touched.whatsapp && whatsappError)}
                aria-describedby={touched.whatsapp && whatsappError ? `${waId}-err` : undefined}
                placeholder="+55 (11) 99999-9999"
                disabled={isGenerating}
                className="w-full rounded-xl border border-white/15 bg-slate-900/90 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
              />
              {touched.whatsapp && whatsappError && (
                <p id={`${waId}-err`} className="mt-1 text-xs text-rose-300">
                  {whatsappError}
                </p>
              )}
            </div>

            <div className="flex items-end sm:col-span-3">
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-emerald-500 px-3 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4 shrink-0" />
                )}
                {isGenerating ? "Gerando..." : "Gerar preview"}
              </button>
            </div>
          </div>

          {/* Quick test chip */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>Teste rápido:</span>
            <button
              type="button"
              onClick={() => setUrl("https://estiloveggieshoes.com.br/")}
              className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-emerald-300 hover:bg-white/10"
            >
              estiloveggieshoes.com.br (Nuvemshop)
            </button>
          </div>

          {isGenerating && (
            <div className="mt-5 rounded-xl border border-emerald-500/20 bg-slate-900/80 p-4" aria-live="polite">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium text-emerald-300">{statusMessage}</span>
                <span className="flex items-center gap-3">
                  <span className="font-bold text-white">{progress}%</span>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="rounded-md border border-white/20 px-2 py-0.5 font-semibold text-slate-200 hover:bg-white/10"
                  >
                    Cancelar
                  </button>
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                aria-label="Progresso da geração"
                className="h-2 w-full overflow-hidden rounded-full bg-slate-800"
              >
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}
        </form>
      </section>

      {/* Recent Previews */}
      <main className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Previews recentes</h2>
              <p className="text-xs text-slate-500">
                Abra no Studio para ajustar cores/textos ou envie a prévia direto para o cliente.
              </p>
            </div>
            <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {pluralize(groups.length, "loja", "lojas")}
            </span>
          </div>

          {isLoadingList ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Carregando previews">
              {[0, 1, 2].map((i) => (
                <div key={i} className="overflow-hidden rounded-xl border border-slate-200">
                  <Skeleton className="h-36 rounded-none" />
                  <div className="space-y-2 p-4">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="mt-4 h-8 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : previews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
              Nenhum preview gerado ainda. Cole a URL de um prospect acima para criar o primeiro!
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map(([item, ...olderVersions]) => (
                <div
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:shadow-md"
                >
                  <div className="relative h-36 bg-slate-100">
                    {item.screenshotPath ? (
                      <img
                        src={
                          item.screenshotPath.startsWith("/api/captures/")
                            ? `${item.screenshotPath}?w=480`
                            : item.screenshotPath
                        }
                        alt={item.storeName}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover object-top"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-400">
                        Sem captura visual
                      </div>
                    )}
                    <span
                      title="Plataforma detectada na loja atual"
                      className="absolute left-2.5 top-2.5 rounded-md bg-slate-900/80 px-2 py-0.5 text-xs font-medium text-white backdrop-blur"
                    >
                      {item.detectedPlatform || "E-commerce"}
                    </span>
                    <span
                      title={
                        item.generationMode === "gemini"
                          ? "Identidade visual analisada com IA (Gemini)"
                          : "Layout montado por heurística, sem IA"
                      }
                      className="absolute right-2.5 top-2.5 rounded-md bg-emerald-800 px-2 py-0.5 text-xs font-semibold uppercase text-white"
                    >
                      {item.generationMode === "gemini" ? "Gemini" : "Auto"}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="truncate font-bold text-slate-900">{item.storeName}</h3>
                    <p className="mt-0.5 truncate text-xs text-slate-600">{item.sourceUrl}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Gerado em {new Date(item.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                    {olderVersions.length > 0 && (
                      <details className="mt-2 text-xs text-slate-600">
                        <summary className="cursor-pointer font-semibold">
                          {pluralize(olderVersions.length, "versão anterior", "versões anteriores")}
                        </summary>
                        <ul className="mt-1 space-y-1">
                          {olderVersions.map((v) => (
                            <li key={v.id} className="flex items-center justify-between gap-2">
                              <Link prefetch={false} href={`/studio/${v.id}`} className="underline hover:text-slate-900">
                                {new Date(v.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDelete(v.id)}
                                aria-label={`Excluir versão de ${new Date(v.createdAt).toLocaleString("pt-BR")}`}
                                className="rounded p-1 text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}

                    <div className="mt-4 flex items-center gap-2 pt-2">
                      <Link
                        prefetch={false}
                        href={`/studio/${item.id}`}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        Abrir Studio
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                      <Link
                        prefetch={false}
                        href={`/preview/${item.slug}`}
                        target="_blank"
                        title="Abrir prévia do cliente"
                        aria-label="Abrir prévia do cliente em nova aba"
                        className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleCopyClientLink(item.slug)}
                        title={copiedSlug === item.slug ? "Link copiado!" : "Copiar link do cliente"}
                        aria-label={copiedSlug === item.slug ? "Link copiado!" : "Copiar link do cliente"}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                      >
                        {copiedSlug === item.slug ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-xs font-semibold text-emerald-700">
                              Copiado!
                            </span>
                          </>
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        title="Excluir"
                        aria-label={`Excluir preview de ${item.storeName}`}
                        className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:border-rose-200 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
