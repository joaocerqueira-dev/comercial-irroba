"use client";

import { Image as ImageIcon, Palette, SlidersHorizontal, Sparkles } from "lucide-react";
import type { StoreBlueprint } from "@/lib/types/blueprint";
import { ElementInspectorPanel } from "./studio/ElementInspectorPanel";
import { StudioTopBar } from "./studio/StudioTopBar";
import { StudioWorkspace } from "./studio/StudioWorkspace";
import { useStudioState } from "./studio/useStudioState";
import { BannersTab } from "./studio/tabs/BannersTab";
import { ColorsTab } from "./studio/tabs/ColorsTab";
import { InsightsTab } from "./studio/tabs/InsightsTab";
import { StructureTab } from "./studio/tabs/StructureTab";

interface StudioClientProps {
  id: string;
  slug: string;
  sourceUrl: string;
  detectedPlatform: string;
  generationMode: string;
  initialWhatsapp: string;
  screenshotPath: string | null;
  fullScreenshotPath: string | null;
  mobileScreenshotPath?: string | null;
  mobileFullScreenshotPath?: string | null;
  initialBlueprint: StoreBlueprint;
  /** Base pública dos assets (PUBLIC_ASSET_BASE_URL). Null = não configurada. */
  publicAssetBaseUrl?: string | null;
  /** Avisos da extração (ex.: produtos/banners não lidos). */
  extractionWarnings?: string[];
}

export default function StudioClient({
  id,
  slug,
  sourceUrl,
  detectedPlatform,
  generationMode,
  initialWhatsapp,
  screenshotPath,
  fullScreenshotPath,
  mobileScreenshotPath = null,
  mobileFullScreenshotPath = null,
  initialBlueprint,
  publicAssetBaseUrl = null,
  extractionWarnings = [],
}: StudioClientProps) {
  const studio = useStudioState({ id, slug, generationMode, initialWhatsapp, initialBlueprint });
  const {
    bp,
    activeTab,
    mobilePane,
    setMobilePane,
    editorTab,
    setEditorTab,
    selectedElement,
    actionError,
    sidebarScrollRef,
    postToPreview,
    selectAndFocusElement,
    mobileTabs,
    editorTabs,
    workspacePanelId,
    editorAsideId,
    previewMainId,
    editorPanelId,
    studioTabs,
    updateBp,
    moveSection,
    toggleSection,
    suggestionsCount,
    handleDownloadBenefitsPng,
  } = studio;

  return (
    <div className="flex h-screen flex-col bg-irroba-surface">
      {/* Top Bar — Irroba BrandBook 2026 */}
      <StudioTopBar studio={studio} sourceUrl={sourceUrl} detectedPlatform={detectedPlatform} />
      {extractionWarnings.length > 0 && (
        <div role="status" className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 lg:px-5">
          {extractionWarnings.join(" ")}
        </div>
      )}

      {/* Abaixo de 1024px: alterna entre editar e visualizar */}
      {activeTab === "preview" && (
        <div {...mobileTabs.getTabListProps("Painel")} className="grid grid-cols-2 border-b border-zinc-200 bg-white text-xs font-semibold lg:hidden">
          {(["edit", "view"] as const).map((pane) => (
            <button
              key={pane}
              type="button"
              {...mobileTabs.getTabProps(pane, pane === "edit" ? editorAsideId : previewMainId)}
              onClick={() => setMobilePane(pane)}
              className={`min-h-[44px] ${mobilePane === pane ? "border-b-2 border-brand-500 text-brand-600" : "text-zinc-500"}`}
            >
              {pane === "edit" ? "Editar" : "Visualizar"}
            </button>
          ))}
        </div>
      )}

      {/* Main Workspace (painel das abas "Modo do estúdio") */}
      <div {...studioTabs.getPanelProps(activeTab, workspacePanelId)} className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Full Freedom Editor (recolhida em Comparar/Exportar) */}
        <aside
          id={editorAsideId}
          className={`${
            activeTab !== "preview" ? "hidden" : mobilePane === "edit" ? "flex" : "hidden lg:flex"
          } w-full shrink-0 flex-col border-r border-zinc-200 bg-white lg:w-96`}
        >
          {/* Sub-tab navigation */}
          <div {...editorTabs.getTabListProps("Seções do editor")} className="grid grid-cols-4 border-b border-zinc-200 bg-irroba-surface text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                selectAndFocusElement(null);
                setEditorTab("insights");
              }}
              {...editorTabs.getTabProps("insights", editorPanelId)}
              className={`relative flex flex-col items-center gap-1 py-2.5 transition ${
                !selectedElement && editorTab === "insights"
                  ? "border-b-2 border-brand-500 bg-white text-brand-600"
                  : "text-zinc-500 hover:text-irroba-ink"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Análise</span>
              {suggestionsCount > 0 && (
                <span
                  title={`${suggestionsCount} sugestão(ões) de ajuste de cor/contraste`}
                  aria-label={`${suggestionsCount} sugestões`}
                  className="absolute right-2 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-700 text-xs font-bold text-white"
                >
                  {suggestionsCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                selectAndFocusElement(null);
                setEditorTab("colors");
              }}
              {...editorTabs.getTabProps("colors", editorPanelId)}
              className={`flex flex-col items-center gap-1 py-2.5 transition ${
                !selectedElement && editorTab === "colors"
                  ? "border-b-2 border-brand-500 bg-white text-brand-600"
                  : "text-zinc-500 hover:text-irroba-ink"
              }`}
            >
              <Palette className="h-3.5 w-3.5" />
              <span>Cores/Botões</span>
            </button>
            <button
              type="button"
              onClick={() => {
                selectAndFocusElement(null);
                setEditorTab("banners");
              }}
              {...editorTabs.getTabProps("banners", editorPanelId)}
              className={`flex flex-col items-center gap-1 py-2.5 transition ${
                !selectedElement && editorTab === "banners"
                  ? "border-b-2 border-brand-500 bg-white text-brand-600"
                  : "text-zinc-500 hover:text-irroba-ink"
              }`}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              <span>Banners</span>
            </button>
            <button
              type="button"
              onClick={() => {
                selectAndFocusElement(null);
                setEditorTab("structure");
              }}
              {...editorTabs.getTabProps("structure", editorPanelId)}
              className={`flex flex-col items-center gap-1 py-2.5 transition ${
                !selectedElement && editorTab === "structure"
                  ? "border-b-2 border-brand-500 bg-white text-brand-600"
                  : "text-zinc-500 hover:text-irroba-ink"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Seções</span>
            </button>
          </div>

          <div
            ref={sidebarScrollRef}
            {...(selectedElement
              ? { id: editorPanelId, "aria-label": "Inspetor do elemento selecionado" }
              : editorTabs.getPanelProps(editorTab, editorPanelId))}
            className="flex-1 overflow-y-auto p-4 text-xs"
          >
            {actionError && (
              <div
                role="alert"
                className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700"
              >
                {actionError}
              </div>
            )}

            {selectedElement ? (
              <ElementInspectorPanel
                previewId={id}
                bp={bp}
                selection={selectedElement}
                onUpdateBp={updateBp}
                onSelect={(next) => selectAndFocusElement(next, Boolean(next))}
                onToggleSection={toggleSection}
                onMoveSection={moveSection}
                onDownloadBenefitsPng={handleDownloadBenefitsPng}
                onShowSlide={(slideIdx) => postToPreview({ type: "irb-studio:show-slide", slideIdx })}
              />
            ) : null}


            {/* TAB 1: DIAGNÓSTICO, PALETA FIEL & MARCA */}
            {!selectedElement && editorTab === "insights" && <InsightsTab studio={studio} />}

            {/* TAB 2: CORES & BOTÕES (LIBERDADE TOTAL) */}
            {!selectedElement && editorTab === "colors" && <ColorsTab studio={studio} />}

            {/* TAB 3: BANNERS (HERO CAROUSEL, SLIM, MOOD, CAMPANHA) */}
            {!selectedElement && editorTab === "banners" && <BannersTab studio={studio} />}

            {/* TAB 4: MANIPULAÇÃO DE SEÇÕES, LOOKBOOK, TIPOGRAFIA, CATEGORIAS & PRODUTOS */}
            {!selectedElement && editorTab === "structure" && <StructureTab studio={studio} />}
          </div>
        </aside>

        {/* Center/Right Pane */}
        <StudioWorkspace
          studio={studio}
          sourceUrl={sourceUrl}
          detectedPlatform={detectedPlatform}
          screenshotPath={screenshotPath}
          fullScreenshotPath={fullScreenshotPath}
          mobileScreenshotPath={mobileScreenshotPath}
          mobileFullScreenshotPath={mobileFullScreenshotPath}
          publicAssetBaseUrl={publicAssetBaseUrl}
        />
      </div>
    </div>
  );
}
