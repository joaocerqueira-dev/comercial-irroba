"use client";

import { AlertCircle, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { AiImageSlot } from "@/components/studio/AiImageSlot";
import { AnnouncementBarControls } from "@/components/studio/AnnouncementBarControls";
import { Field } from "@/components/ui/Field";
import { useAiStatus } from "@/components/studio/AiStatusContext";
import { aiDisabledReason } from "@/lib/ai/status";
import Link from "next/link";
import type { StudioState } from "@/components/studio/useStudioState";

/** Aba Análise: diagnóstico de paleta, reanálise com IA e identidade da marca. */
export function InsightsTab({ studio }: { studio: StudioState }) {
  const {
    id,
    bp,
    baselineTheme,
    pendingReanalysis,
    setPendingReanalysis,
    sellerWhatsapp,
    setSellerWhatsapp,
    isReanalyzing,
    updateBp,
    handleReanalyzeWithAi,
    applyInsightSuggestion,
    restoreOriginalPalette,
    acceptReanalysis,
  } = studio;

  const textReason = aiDisabledReason(useAiStatus(), "text");

  return (
    <div className="space-y-4">

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="font-bold text-zinc-900">
            Diagnóstico de Paleta &amp; Conversão
          </span>
          <button aria-label="Restaurar paleta original extraída"
            type="button"
            onClick={restoreOriginalPalette}
            className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-zinc-900"
            title="Restaurar paleta original extraída"
          >
            <RotateCcw className="h-3 w-3" />
            Original
          </button>
        </div>

        <button
          type="button"
          onClick={handleReanalyzeWithAi}
          disabled={isReanalyzing || Boolean(textReason)}
          title={textReason ?? undefined}
          className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-3 py-2 font-heading text-xs font-bold text-white shadow-sm transition hover:bg-brand-600 active:bg-brand-800 disabled:opacity-60"
        >
          {isReanalyzing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {isReanalyzing
            ? "Analisando identidade com IA..."
            : "Reanalisar identidade com IA"}
        </button>
        {textReason && (
          <p className="-mt-2 mb-3 text-xs text-zinc-600">
            {textReason}.{" "}
            <Link href="/conta/ia" className="font-semibold text-brand-700 underline">
              Minha IA
            </Link>
          </p>
        )}

        {pendingReanalysis && (
          <div
            role="alertdialog"
            aria-label="Resultado da reanálise"
            className="mb-3 rounded-xl border border-brand-200 bg-brand-50 p-2.5 text-xs text-brand-900"
          >
            <p className="font-semibold">Reanálise pronta. Como aplicar?</p>
            <p className="mt-0.5 text-brand-800">
              Nada é salvo até você clicar em Salvar. &quot;Substituir tudo&quot; descarta suas edições atuais.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => acceptReanalysis("palette")}
                className="rounded-lg bg-brand-500 px-2.5 py-1 font-bold text-white hover:bg-brand-600"
              >
                Aplicar só a paleta
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Substituir todo o layout pela reanálise? Suas edições atuais serão perdidas.")) {
                    acceptReanalysis("all");
                  }
                }}
                className="rounded-lg border border-brand-500 px-2.5 py-1 font-bold text-brand-700 hover:bg-brand-100"
              >
                Substituir tudo
              </button>
              <button
                type="button"
                onClick={() => setPendingReanalysis(null)}
                className="rounded-lg px-2 py-1 font-semibold text-zinc-600 hover:bg-white"
              >
                Descartar
              </button>
            </div>
          </div>
        )}

        {bp.designInsights.length === 0 ? (
          <p className="text-zinc-500">
            Paleta fiel aplicada a partir do site original ({baselineTheme.primaryBackground}).
          </p>
        ) : (
          <div className="space-y-2.5">
            {bp.designInsights.map((insight) => (
              <div
                key={insight.id}
                className={`rounded-xl border p-2.5 ${
                  insight.severity === "suggestion"
                    ? "border-amber-200 bg-amber-50/70"
                    : "border-zinc-200 bg-white"
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertCircle
                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                      insight.severity === "suggestion"
                        ? "text-amber-600"
                        : "text-brand-500"
                    }`}
                  />
                  <div className="space-y-1">
                    <div className="font-bold text-zinc-900">{insight.title}</div>
                    <p className="leading-relaxed text-zinc-600">{insight.description}</p>
                    {insight.suggestedThemePatch && insight.actionLabel && (
                      <button
                        type="button"
                        onClick={() => applyInsightSuggestion(insight)}
                        className="mt-1 inline-flex items-center gap-1 rounded-lg bg-irroba-ink px-2.5 py-1 text-xs font-semibold text-white hover:bg-zinc-800"
                      >
                        <Sparkles className="h-3 w-3 text-brand-200" />
                        {insight.actionLabel}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2.5 rounded-xl border border-zinc-200 p-3">
        <div className="font-bold text-zinc-800">Identidade da Marca</div>
        <div>
          <Field label="Nome da Loja" labelClassName="mb-1 block text-zinc-500">
          <input
            type="text"
            value={bp.brand.name}
            onChange={(e) =>
              updateBp((prev) => ({
                ...prev,
                brand: { ...prev.brand, name: e.target.value },
              }))
            }
            className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-zinc-900"
          />
          </Field>
        </div>
        <AiImageSlot
          previewId={id}
          label="Logotipo da Loja"
          value={bp.brand.logoUrl}
          defaultAspectRatio="1:1"
          minRecommendedWidth={0}
          fit="contain"
          allowClear
          onChange={(nextUrl) =>
            updateBp((prev) => ({
              ...prev,
              brand: { ...prev.brand, logoUrl: nextUrl },
            }))
          }
        />
        <div>
          <Field label="Nicho / Segmento" labelClassName="mb-1 block text-zinc-500">
          <input
            type="text"
            value={bp.brand.niche}
            onChange={(e) =>
              updateBp((prev) => ({
                ...prev,
                brand: { ...prev.brand, niche: e.target.value },
              }))
            }
            className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-zinc-900"
          />
          </Field>
        </div>
        <div>
          <Field label="WhatsApp do Consultor (CTA)" labelClassName="mb-1 block text-zinc-500">
          <input
            type="text"
            value={sellerWhatsapp}
            onChange={(e) => {
              setSellerWhatsapp(e.target.value);
            }}
            placeholder="5511999999999"
            className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-zinc-900"
          />
          </Field>
        </div>
        <AnnouncementBarControls bp={bp} onUpdateBp={updateBp} showColors={false} />
      </div>
    </div>
  );
}
