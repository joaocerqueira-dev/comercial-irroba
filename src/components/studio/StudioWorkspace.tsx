"use client";

import { Hand, Monitor, MousePointerClick, Smartphone, X } from "lucide-react";
import { PREVIEW_IFRAME_SANDBOX } from "@/lib/security/preview-isolation";
import StoreCompareView from "@/components/StoreCompareView";
import { ExportPanel } from "@/components/studio/ExportPanel";
import { INSPECTOR_META } from "@/components/studio/inspectorTargets";
import type { StudioState } from "@/components/studio/useStudioState";

interface StudioWorkspaceProps {
  studio: StudioState;
  sourceUrl: string;
  detectedPlatform: string;
  screenshotPath: string | null;
  fullScreenshotPath: string | null;
  mobileScreenshotPath: string | null;
  mobileFullScreenshotPath: string | null;
  publicAssetBaseUrl: string | null;
}

/** Painel principal: prévia ao vivo, comparação com a loja original ou exportação. */
export function StudioWorkspace({ studio, sourceUrl, detectedPlatform, screenshotPath, fullScreenshotPath, mobileScreenshotPath, mobileFullScreenshotPath, publicAssetBaseUrl }: StudioWorkspaceProps) {
  const {
    id,
    slug,
    bp,
    activeTab,
    mobilePane,
    device,
    setDevice,
    inspectMode,
    setInspectMode,
    selectedElement,
    hoveredPreviewLabel,
    copiedKey,
    previewIframeRef,
    selectAndFocusElement,
    previewMainId,
    liveHtml,
    compareHtml,
    compiled,
    copyText,
    handleDownloadBenefitsPng,
  } = studio;

  return activeTab === "preview" ? (
      <main id={previewMainId} className={`${mobilePane === "view" ? "flex" : "hidden lg:flex"} flex-1 flex-col overflow-hidden p-2 lg:p-4`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Modo de interação da prévia"
              className="flex items-center gap-0.5 rounded-xl border border-zinc-200 bg-white p-1 shadow-sm"
            >
              <button
                type="button"
                onClick={() => setInspectMode(true)}
                aria-pressed={inspectMode}
                title="Passe o cursor nos elementos do layout para ver o nome e clique para editar"
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  inspectMode
                    ? "bg-brand-500 text-white shadow-sm"
                    : "text-zinc-600 hover:text-irroba-ink"
                }`}
              >
                <MousePointerClick className="h-3.5 w-3.5" />
                Clicar para Editar
              </button>
              <button
                type="button"
                onClick={() => setInspectMode(false)}
                aria-pressed={!inspectMode}
                title="Teste livremente menus, busca, sacola e página de produto"
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  !inspectMode
                    ? "bg-irroba-ink text-white"
                    : "text-zinc-600 hover:text-irroba-ink"
                }`}
              >
                <Hand className="h-3.5 w-3.5" />
                Navegar na Loja
              </button>
            </div>

            {inspectMode && hoveredPreviewLabel ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                {hoveredPreviewLabel} — clique para editar
              </span>
            ) : selectedElement ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-brand-300 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">
                Editando: {selectedElement.label || INSPECTOR_META[selectedElement.targetId].title}
                <button
                  type="button"
                  onClick={() => selectAndFocusElement(null)}
                  aria-label="Fechar seleção do elemento"
                  className="ml-0.5 rounded-full p-0.5 text-brand-600 hover:bg-brand-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : (
              <span className="hidden text-xs font-medium text-zinc-500 xl:inline">
                {inspectMode
                  ? "Passe o cursor sobre qualquer elemento do layout para ver o nome e clique para editá-lo"
                  : "Modo navegação ativo — clique em produtos, menu ou sacola para testar"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setDevice("desktop")}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                device === "desktop" ? "bg-irroba-ink text-white" : "text-zinc-600 hover:text-irroba-ink"
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setDevice("mobile")}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                device === "mobile" ? "bg-irroba-ink text-white" : "text-zinc-600 hover:text-irroba-ink"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              Mobile
            </button>
          </div>
        </div>

        <div className="flex flex-1 items-start justify-center overflow-auto rounded-2xl border border-zinc-200 bg-zinc-200/60 p-3">
          <iframe
            ref={previewIframeRef}
            srcDoc={liveHtml}
            // Sem allow-same-origin: o HTML gerado não alcança o DOM/cookies do app.
            // O estado inicial chega por postMessage (irb-studio:ready → set-state).
            sandbox={PREVIEW_IFRAME_SANDBOX}
            title="Preview Irroba LIME"
            className={`h-full rounded-xl bg-white shadow-xl transition-all duration-300 ${
              device === "mobile" ? "w-[390px] rounded-[28px] border-8 border-irroba-ink" : "w-full"
            }`}
          />
        </div>
      </main>
    ) : activeTab === "compare" ? (
      <main className="flex min-h-0 flex-1 overflow-hidden">
        <StoreCompareView
          slug={slug}
          previewId={id}
          storeName={bp.brand.name}
          sourceUrl={sourceUrl}
          detectedPlatform={detectedPlatform}
          fullScreenshotPath={fullScreenshotPath}
          screenshotPath={screenshotPath}
          mobileFullScreenshotPath={mobileFullScreenshotPath}
          mobileScreenshotPath={mobileScreenshotPath}
          device={device}
          onDeviceChange={setDevice}
          proposalSrcDoc={compareHtml}
        />
      </main>
    ) : compiled ? (
      <ExportPanel
        id={id}
        compiled={compiled}
        copiedKey={copiedKey}
        copyText={copyText}
        onDownloadBenefitsPng={handleDownloadBenefitsPng}
        publicAssetBaseUrl={publicAssetBaseUrl}
      />
    ) : null;
}
