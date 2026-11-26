"use client";

import { ArrowLeft, Check, Code2, Columns2, Copy, ExternalLink, Eye, Save, Sparkles } from "lucide-react";
import Link from "next/link";
import { IrrobaLogo } from "@/components/ui/IrrobaLogo";
import type { StudioState } from "@/components/studio/useStudioState";

interface StudioTopBarProps {
  studio: StudioState;
  sourceUrl: string;
  detectedPlatform: string;
}

/** Barra superior: voltar, marca, abas do estúdio, salvar e link do cliente. */
export function StudioTopBar({ studio, sourceUrl, detectedPlatform }: StudioTopBarProps) {
  const {
    slug,
    router,
    bp,
    currentMode,
    activeTab,
    setActiveTab,
    isSaving,
    hasUnsavedChanges,
    savedNotice,
    copiedKey,
    studioTabs,
    workspacePanelId,
    copyText,
    handleSave,
  } = studio;

  return (
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-white px-3 py-2 lg:gap-3 lg:px-5 lg:py-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (
              hasUnsavedChanges &&
              !window.confirm("Você tem alterações não salvas. Deseja sair e descartá-las?")
            ) {
              return;
            }
            router.push("/");
          }}
          className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-brand-200 hover:bg-brand-50/50 hover:text-brand-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </button>
        <IrrobaLogo variant="symbol" theme="light" className="hidden h-7 w-auto sm:block" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-sm font-bold text-irroba-ink">{bp.brand.name}</h1>
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
              Origem: {detectedPlatform}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                currentMode === "gemini"
                  ? "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200/70"
                  : "bg-zinc-100 text-zinc-700"
              }`}
            >
              <Sparkles className="h-3 w-3" />
              {currentMode === "gemini" ? "Analisado com IA" : "Modo heurístico"}
            </span>
            {hasUnsavedChanges && (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                Alterações não salvas
              </span>
            )}
          </div>
          <p className="hidden max-w-md truncate text-xs text-zinc-500 sm:block">{sourceUrl}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div {...studioTabs.getTabListProps("Modo do estúdio")} className="flex rounded-xl border border-zinc-200 bg-irroba-surface p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            {...studioTabs.getTabProps("preview", workspacePanelId)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "preview"
                ? "bg-white text-brand-600 shadow-sm"
                : "text-zinc-600 hover:text-irroba-ink"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview ao Vivo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("compare")}
            {...studioTabs.getTabProps("compare", workspacePanelId)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "compare"
                ? "bg-white text-brand-600 shadow-sm"
                : "text-zinc-600 hover:text-irroba-ink"
            }`}
          >
            <Columns2 className="h-3.5 w-3.5" />
            Comparar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("export")}
            {...studioTabs.getTabProps("export", workspacePanelId)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "export"
                ? "bg-white text-brand-600 shadow-sm"
                : "text-zinc-600 hover:text-irroba-ink"
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            Exportar para Irroba
          </button>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-heading text-xs font-semibold text-white transition disabled:opacity-60 ${
            hasUnsavedChanges
              ? "bg-brand-600 hover:bg-brand-700"
              : "bg-irroba-ink hover:bg-zinc-800"
          }`}
        >
          {savedNotice ? <Check className="h-3.5 w-3.5 text-brand-200" /> : <Save className="h-3.5 w-3.5" />}
          {isSaving ? "Salvando..." : savedNotice ? "Salvo!" : "Salvar Alterações"}
        </button>

        <details className="relative lg:hidden">
          <summary className="flex min-h-[36px] cursor-pointer list-none items-center rounded-xl border border-zinc-200 px-3 text-xs font-semibold text-zinc-700">
            Mais
          </summary>
          <div className="absolute right-0 z-30 mt-1 flex w-56 flex-col gap-1 rounded-2xl border border-zinc-200 bg-white p-2 shadow-lg">
            <button
              type="button"
              onClick={() => copyText("client-link", `${window.location.origin}/preview/${slug}`)}
              className="rounded-xl px-3 py-2 text-left text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              {copiedKey === "client-link" ? "Link copiado!" : "Copiar link do cliente"}
            </button>
            <Link
              href={`/preview/${slug}`}
              target="_blank"
              className="rounded-xl px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              Abrir prévia do cliente
            </Link>
          </div>
        </details>

        <button
          type="button"
          onClick={() => copyText("client-link", `${window.location.origin}/preview/${slug}`)}
          className="hidden lg:flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 font-heading text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
        >
          {copiedKey === "client-link" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copiedKey === "client-link" ? "Link Copiado!" : "Copiar Link do Cliente"}
        </button>

        <Link
          href={`/preview/${slug}`}
          target="_blank"
          className="hidden lg:flex items-center gap-1.5 rounded-xl bg-brand-500 px-3.5 py-2 font-heading text-xs font-bold text-white shadow-sm transition hover:bg-brand-600 active:bg-brand-800"
        >
          Abrir prévia do cliente
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </header>
  );
}
