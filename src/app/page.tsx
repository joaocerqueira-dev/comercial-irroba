"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { IrrobaLogo } from "@/components/ui/IrrobaLogo";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatWhatsapp, hostnameOf, isValidWhatsapp, normalizeStoreUrl, pluralize } from "@/lib/format/inputs";
import { readEventStream } from "@/lib/sse/readEventStream";
import { shareBadgeLabel } from "@/lib/share/badge";
import { useCopyToClipboard } from "@/components/ui/useCopyToClipboard";
import Link from "next/link";
import { isAiMode } from "@/lib/ai/mode";
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
  aiProvider: string | null;
  aiModel: string | null;
  status: string;
  screenshotPath: string | null;
  createdAt: string;
  shareStatus: string;
  legacyPublic: boolean;
  shareExpiresAt: string | null;
  unseenResponses: number;
  owner: { id: string; name: string } | null;
}

interface Me {
  id: string;
  name: string;
  role: string;
}

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [sellerWhatsapp, setSellerWhatsapp] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [extractionWarning, setExtractionWarning] = useState<string | null>(null);
  const [previews, setPreviews] = useState<PreviewSummary[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [me, setMe] = useState<Me | null>(null);
  const [hasTextAi, setHasTextAi] = useState(true);
  const [ownerFilter, setOwnerFilter] = useState("");
  // Opções do filtro vêm da lista sem filtro (sem API nova)
  const [owners, setOwners] = useState<{ id: string; name: string }[]>([]);
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
  const { copiedKey: copiedSlug, copy } = useCopyToClipboard(2000);
  const abortRef = useRef<AbortController | null>(null);
  const urlId = useId();
  const waId = useId();

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  const loadPreviews = async (owner = "") => {
    try {
      const res = await fetch(owner ? `/api/previews?owner=${encodeURIComponent(owner)}` : "/api/previews");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (res.status === 403) {
        const data = (await res.json().catch(() => ({}))) as { code?: string };
        if (data.code === "MUST_CHANGE_PASSWORD") window.location.href = "/conta/senha";
        return;
      }
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

  // A geração segue no servidor se o usuário sair da página; só não pode "sequestrar"
  // a navegação com o router.push do evento done.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    loadPreviews();
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then(async (data: { user?: Me } | null) => {
        setMe(data?.user ?? null);
        if (data?.user?.role !== "admin") return;
        const r = await fetch("/api/admin/users");
        if (r.ok) setOwners(((await r.json()) as { users: { id: string; name: string }[] }).users.map(({ id, name }) => ({ id, name })));
      })
      .catch(() => undefined);
    fetch("/api/me/ai")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { texto: unknown } | null) => data && setHasTextAi(Boolean(data.texto)))
      .catch(() => undefined);
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ url: true, whatsapp: true });
    if (!canSubmit || !normalizedUrl) return;

    setIsGenerating(true);
    setProgress(10);
    setStatusMessage("Conectando ao site do cliente...");
    setError(null);
    setExtractionWarning(null);

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
        } else if (eventName === "warning") {
          setExtractionWarning(String(payload.message ?? ""));
        } else if (eventName === "done") {
          setProgress(100);
          setStatusMessage("Preview gerado com sucesso!");
          if (!mountedRef.current) return true;
          router.push(`/studio/${String(payload.id)}`);
          // Caso a navegação não desmonte a página, não deixa o formulário travado
          setIsGenerating(false);
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
    if (!(await copy(slug, shareUrl))) {
      window.prompt("Copie o link do cliente:", shareUrl);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.href = "/login";
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
    <div className="flex min-h-screen flex-col bg-irroba-surface text-irroba-ink">
      {/* Header Institucional Claro (BrandBook 2026) */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <IrrobaLogo variant="primary" theme="light" className="h-8 w-auto sm:h-9" />
            <span className="hidden h-6 w-px bg-zinc-200 sm:block" aria-hidden="true" />
            <div className="hidden sm:block">
              <div className="font-heading text-xs font-bold uppercase tracking-wider text-irroba-ink">
                Preview <span className="text-brand-500">AI</span>
              </div>
              <div className="text-xs text-zinc-500">
                Gerador Comercial de Lojas · Padrão Tema LIME
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {me && <span className="hidden font-heading font-bold text-irroba-ink sm:inline">{me.name}</span>}
            {me && (
              <Link href="/conta/ia" className="font-heading font-bold text-brand-700 hover:underline">
                Minha IA
              </Link>
            )}
            {me?.role === "admin" && (
              <Link href="/admin/usuarios" className="font-heading font-bold text-brand-700 hover:underline">
                Usuários
              </Link>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full bg-brand-50 px-3.5 py-1 font-heading font-bold text-brand-700 ring-1 ring-inset ring-brand-200/70 hover:bg-brand-100"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Hero / Generator Card com camadas vermelhas do BrandBook */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-10 pt-8">
        <div className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-brand-900 shadow-sm">
          {/* Tonalidades em camadas arredondadas (BrandBook capa / divisórias: #EA191F → #CC0E11 → #AE0203 → #830000) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 hidden w-44 lg:flex"
          >
            <div className="h-full flex-1 bg-brand-500" />
            <div className="h-full flex-1 rounded-l-3xl bg-brand-600" />
            <div className="h-full flex-1 rounded-l-3xl bg-brand-700" />
            <div className="h-full flex-1 rounded-l-3xl bg-brand-900" />
          </div>

          <div className="relative rounded-3xl bg-white px-6 py-9 sm:px-10 sm:py-11 lg:mr-28 lg:rounded-r-[2.25rem]">
            {/* Semicírculo decorativo (BrandBook pág. 17 - Formas) */}
            <svg
              aria-hidden="true"
              viewBox="0 0 80 160"
              className="pointer-events-none absolute -left-2 top-10 hidden h-28 w-14 text-brand-500/15 sm:block"
            >
              <path
                d="M 8 14 A 60 60 0 0 1 8 146"
                fill="none"
                stroke="currentColor"
                strokeWidth="16"
                strokeLinecap="round"
              />
            </svg>

            <div className="mx-auto max-w-4xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200/70">
                <Sparkles className="h-3.5 w-3.5 text-brand-500" />
                Transforme qualquer concorrente em uma prévia na Irroba em segundos
              </div>

              <h1 className="font-heading text-3xl font-extrabold tracking-tight text-irroba-ink sm:text-4xl lg:leading-[1.15]">
                Mostre ao cliente como a loja dele ficaria na{" "}
                <span className="text-brand-500">Irroba</span> — de um jeito{" "}
                <em className="font-serif font-normal italic text-brand-500">único</em>.
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
                Cole a URL atual do prospect (Nuvemshop, Tray, Loja Integrada, Shopify, WooCommerce). A
                ferramenta extrai logo, cores, categorias e produtos e gera um link interativo com
                blocos prontos para o Tema LIME.
              </p>

              {!hasTextAi && (
                <p className="mt-6 text-sm text-zinc-700">
                  Configure sua IA para gerar com IA{" "}
                  <Link href="/conta/ia" className="font-semibold text-brand-700 underline">
                    Minha IA
                  </Link>
                </p>
              )}

              <form
                onSubmit={handleGenerate}
                className="mt-7 rounded-2xl border border-zinc-200/90 bg-irroba-surface p-4 text-left sm:p-5"
              >
                <div className="grid items-end gap-3 sm:grid-cols-12">
                  <div className="sm:col-span-6">
                    <label
                      htmlFor={urlId}
                      className="mb-1.5 block truncate font-heading text-xs font-semibold text-zinc-700"
                    >
                      URL do e-commerce atual do cliente
                    </label>
                    <div className="relative">
                      <Globe className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
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
                        className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-3 text-sm text-irroba-ink shadow-sm placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15 disabled:bg-zinc-100"
                      />
                    </div>
                    {touched.url && urlError && (
                      <p id={`${urlId}-err`} className="mt-1 text-xs font-medium text-brand-700">
                        {urlError}
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-3">
                    <label
                      htmlFor={waId}
                      className="mb-1.5 block truncate font-heading text-xs font-semibold text-zinc-700"
                    >
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
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-irroba-ink shadow-sm placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15 disabled:bg-zinc-100"
                    />
                    {touched.whatsapp && whatsappError && (
                      <p id={`${waId}-err`} className="mt-1 text-xs font-medium text-brand-700">
                        {whatsappError}
                      </p>
                    )}
                  </div>

                  <div className="flex items-end sm:col-span-3">
                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className="flex min-h-[42px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand-500 px-4 py-2.5 font-heading text-sm font-bold text-white shadow-sm transition hover:bg-brand-600 active:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-55"
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
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <span className="font-medium">Teste rápido:</span>
                  <button
                    type="button"
                    onClick={() => setUrl("https://estiloveggieshoes.com.br/")}
                    className="rounded-lg border border-brand-200/80 bg-white px-2.5 py-1 font-semibold text-brand-600 transition hover:bg-brand-50"
                  >
                    estiloveggieshoes.com.br (Nuvemshop)
                  </button>
                </div>

                {isGenerating && (
                  <div
                    className="mt-5 rounded-xl border border-brand-200/80 bg-white p-4 shadow-sm"
                    aria-live="polite"
                  >
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-semibold text-brand-700">{statusMessage}</span>
                      <span className="flex items-center gap-3">
                        <span className="font-heading font-bold text-irroba-ink">{progress}%</span>
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 font-semibold text-zinc-700 hover:bg-zinc-100"
                        >
                          Cancelar
                        </button>
                      </span>
                    </div>
                    {extractionWarning && (
                      <p
                        role="status"
                        className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
                      >
                        {extractionWarning}
                      </p>
                    )}
                    <div
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={progress}
                      aria-label="Progresso da geração"
                      className="h-2 w-full overflow-hidden rounded-full bg-brand-100"
                    >
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <div
                    role="alert"
                    className="mt-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800"
                  >
                    {error}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Previews Recentes */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16">
        <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm sm:p-7">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-bold text-irroba-ink">
                Previews <span className="text-brand-500">recentes</span>
              </h2>
              <p className="text-xs text-zinc-500">
                Abra no Studio para ajustar cores, textos e seções ou envie a prévia direto para o cliente.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {me?.role === "admin" && (
                <select
                  aria-label="Filtrar por dono"
                  value={ownerFilter}
                  onChange={(e) => {
                    setOwnerFilter(e.target.value);
                    loadPreviews(e.target.value);
                  }}
                  className="rounded-xl bg-irroba-surface px-3 py-1 font-heading text-xs font-bold text-zinc-700 ring-1 ring-inset ring-zinc-200/80"
                >
                  <option value="">Todos</option>
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              )}
              <span className="rounded-xl bg-irroba-surface px-3 py-1 font-heading text-xs font-bold text-zinc-700 ring-1 ring-inset ring-zinc-200/80">
                {pluralize(groups.length, "loja", "lojas")}
              </span>
            </div>
          </div>

          {isLoadingList ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Carregando previews">
              {[0, 1, 2].map((i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-zinc-200">
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
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-irroba-surface/60 py-12 text-center text-sm text-zinc-500">
              Nenhum preview gerado ainda. Cole a URL de um prospect acima para criar o primeiro!
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map(([item, ...olderVersions]) => (
                <div
                  key={item.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white transition hover:border-brand-200 hover:shadow-md"
                >
                  <div className="relative h-36 bg-zinc-100">
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
                      <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                        Sem captura visual
                      </div>
                    )}
                    <span
                      title="Plataforma detectada na loja atual"
                      className="absolute left-2.5 top-2.5 rounded-lg bg-irroba-ink/85 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur"
                    >
                      {item.detectedPlatform || "E-commerce"}
                    </span>
                    <span
                      title={
                        isAiMode(item.generationMode)
                          ? `Identidade visual analisada com IA${item.aiProvider ? ` (${item.aiProvider}${item.aiModel ? `/${item.aiModel}` : ""})` : ""}`
                          : "Layout montado por heurística, sem IA"
                      }
                      className={`absolute right-2.5 top-2.5 rounded-lg px-2.5 py-0.5 font-heading text-[11px] font-bold uppercase tracking-wide text-white ${
                        isAiMode(item.generationMode) ? "bg-brand-500" : "bg-zinc-700"
                      }`}
                    >
                      {isAiMode(item.generationMode) ? "IA" : "Auto"}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="truncate font-heading font-bold text-irroba-ink">{item.storeName}</h3>
                    <p className="mt-0.5 truncate text-xs text-zinc-600">{item.sourceUrl}</p>
                    {me?.role === "admin" && (
                      <p className="mt-0.5 truncate text-xs text-zinc-500">Dono: {item.owner?.name ?? "Sem dono"}</p>
                    )}
                    <p className="mt-1 flex items-center gap-1.5">
                      <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
                        {shareBadgeLabel(item)}
                      </span>
                      {item.unseenResponses > 0 && (
                        <span
                          title="Respostas novas do cliente"
                          aria-label={`${item.unseenResponses} respostas novas`}
                          className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white"
                        >
                          {item.unseenResponses}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      Gerado em{" "}
                      {new Date(item.createdAt).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                    {olderVersions.length > 0 && (
                      <details className="mt-2 text-xs text-zinc-600">
                        <summary className="cursor-pointer font-semibold hover:text-brand-600">
                          {pluralize(olderVersions.length, "versão anterior", "versões anteriores")}
                        </summary>
                        <ul className="mt-1 space-y-1">
                          {olderVersions.map((v) => (
                            <li key={v.id} className="flex items-center justify-between gap-2">
                              <Link
                                prefetch={false}
                                href={`/studio/${v.id}`}
                                className="underline hover:text-brand-600"
                              >
                                {new Date(v.createdAt).toLocaleString("pt-BR", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })}
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDelete(v.id)}
                                aria-label={`Excluir versão de ${new Date(v.createdAt).toLocaleString("pt-BR")}`}
                                className="rounded p-1 text-zinc-400 hover:text-brand-600"
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
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-3 py-2 font-heading text-xs font-bold text-white shadow-sm transition hover:bg-brand-600 active:bg-brand-800"
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
                        className="rounded-xl border border-zinc-200 p-2 text-zinc-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleCopyClientLink(item.slug)}
                        title={copiedSlug === item.slug ? "Link copiado!" : "Copiar link do cliente"}
                        aria-label={copiedSlug === item.slug ? "Link copiado!" : "Copiar link do cliente"}
                        className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 p-2 text-zinc-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600"
                      >
                        {copiedSlug === item.slug ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-brand-500" />
                            <span className="text-xs font-semibold text-brand-700">Copiado!</span>
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
                        className="rounded-xl border border-zinc-200 p-2 text-zinc-400 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
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

      {/* Rodapé Institucional Irroba */}
      <footer className="border-t border-zinc-200/80 bg-white py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 text-xs text-zinc-400">
          <span>© Copyright 1998 / 2026 Irroba E-commerce</span>
          <IrrobaLogo
            variant="symbol"
            theme="mono-black"
            className="h-5 w-auto opacity-25"
            ariaLabel="Símbolo Irroba"
          />
        </div>
      </footer>
    </div>
  );
}
