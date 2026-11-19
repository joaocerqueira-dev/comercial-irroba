"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { copyToClipboard } from "@/lib/client/clipboard";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Code2,
  Columns2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  Monitor,
  Palette,
  Plus,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Trash2,
} from "lucide-react";
import { generateBenefitsBannerSvgString } from "@/lib/irroba-blocks/banner-art-generator";
import { compileIrrobaExport, compileStorefrontDocument } from "@/lib/irroba-blocks/compiler";
import {
  DEFAULT_SECTION_LAYOUT,
  getNormalizedSectionLayout,
  type DesignInsight,
  type SectionKey,
  type StoreBlueprint,
} from "@/lib/types/blueprint";
import StoreCompareView from "./StoreCompareView";
import { AiImageSlot } from "./studio/AiImageSlot";
import { ColorField } from "./studio/ColorField";
import { FONT_OPTIONS } from "./studio/fontOptions";
import { ExportPanel } from "./studio/ExportPanel";

interface StudioClientProps {
  id: string;
  slug: string;
  sourceUrl: string;
  detectedPlatform: string;
  generationMode: string;
  initialWhatsapp: string;
  screenshotPath: string | null;
  fullScreenshotPath: string | null;
  initialBlueprint: StoreBlueprint;
  /** Base pública dos assets (PUBLIC_ASSET_BASE_URL). Null = não configurada. */
  publicAssetBaseUrl?: string | null;
}

type EditorSubTab = "insights" | "colors" | "banners" | "structure";


export default function StudioClient({
  id,
  slug,
  sourceUrl,
  detectedPlatform,
  generationMode,
  initialWhatsapp,
  screenshotPath,
  fullScreenshotPath,
  initialBlueprint,
  publicAssetBaseUrl = null,
}: StudioClientProps) {
  const router = useRouter();
  const [bp, setBp] = useState<StoreBlueprint>(initialBlueprint);
  const [baselineTheme, setBaselineTheme] = useState(initialBlueprint.theme);
  // Último blueprint salvo/aceito: base do botão "Original"
  const [baselineBp, setBaselineBp] = useState<StoreBlueprint>(initialBlueprint);
  const [pendingReanalysis, setPendingReanalysis] = useState<{ blueprint: StoreBlueprint; mode: string } | null>(null);
  const [currentMode, setCurrentMode] = useState(generationMode);
  const [sellerWhatsapp, setSellerWhatsapp] = useState(initialWhatsapp);
  const [activeTab, setActiveTab] = useState<"preview" | "compare" | "export">("preview");
  const [mobilePane, setMobilePane] = useState<"edit" | "view">("view");
  const [editorTab, setEditorTab] = useState<EditorSubTab>("insights");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [isSaving, setIsSaving] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [dragSectionIdx, setDragSectionIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragSectionIdxRef = useRef<number | null>(null);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Prévia ao vivo usa valor adiado: digitação não recompila o iframe a cada tecla
  const deferredBp = useDeferredValue(bp);
  const liveHtml = useMemo(() => compileStorefrontDocument(deferredBp), [deferredBp]);
  // Pacote de export só é calculado na aba Exportar
  const compiled = useMemo(
    () => (activeTab === "export" ? compileIrrobaExport(bp) : null),
    [activeTab, bp]
  );
  const sectionLayout = useMemo(() => getNormalizedSectionLayout(bp.sections.layout), [bp.sections.layout]);

  const updateBp = (updater: (prev: StoreBlueprint) => StoreBlueprint) => {
    setBp((prev) => updater(prev));
    setHasUnsavedChanges(true);
  };

  const moveSection = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= sectionLayout.length || fromIdx === toIdx) return;
    updateBp((prev) => {
      const next = getNormalizedSectionLayout(prev.sections.layout);
      const [moved] = next.splice(fromIdx, 1);
      if (!moved) return prev;
      next.splice(toIdx, 0, moved);
      return { ...prev, sections: { ...prev.sections, layout: next } };
    });
  };

  const toggleSection = (sectionId: SectionKey) => {
    updateBp((prev) => {
      const next = getNormalizedSectionLayout(prev.sections.layout).map((s) =>
        s.id === sectionId ? { ...s, enabled: !s.enabled } : s
      );
      return { ...prev, sections: { ...prev.sections, layout: next } };
    });
  };

  const resetSectionLayout = () => {
    updateBp((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        layout: DEFAULT_SECTION_LAYOUT.map((s) => ({ ...s })),
      },
    }));
  };

  const copyText = async (key: string, text: string) => {
    if (!(await copyToClipboard(text))) {
      setActionError("Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.");
      return;
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/previews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blueprint: bp, sellerWhatsapp, generationMode: currentMode }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error || "Falha ao salvar alterações");
      }
      setBaselineTheme(bp.theme);
      setBaselineBp(bp);
      setHasUnsavedChanges(false);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro de conexão ao salvar");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReanalyzeWithGemini = async () => {
    setIsReanalyzing(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/previews/${id}/reanalyze`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        blueprint?: StoreBlueprint;
        mode?: string;
        aiError?: string | null;
        error?: string;
        preserved?: boolean;
      };
      if (!res.ok || data.preserved || !data.blueprint) {
        setActionError(
          data.error ||
            (data.aiError
              ? `Gemini 3.5 indisponível: ${data.aiError}`
              : "Falha ao reanalisar com Gemini. O layout atual foi preservado.")
        );
        return;
      }
      if (data.mode && data.mode !== "gemini") {
        setActionError(
          data.aiError
            ? `Gemini 3.5 indisponível: ${data.aiError} O layout atual foi preservado.`
            : "Gemini 3.5 indisponível. O layout atual foi preservado."
        );
        return;
      }
      // Não aplica direto: o usuário escolhe entre substituir tudo ou só a paleta
      setPendingReanalysis({ blueprint: data.blueprint, mode: data.mode || "gemini" });
      if (data.aiError) {
        setActionError(`Gemini 3.5 indisponível: ${data.aiError}`);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao conectar com Gemini");
    } finally {
      setIsReanalyzing(false);
    }
  };

  const applyInsightSuggestion = (insight: DesignInsight) => {
    const patch = insight.suggestedThemePatch;
    if (!patch) return;
    updateBp((prev) => ({
      ...prev,
      theme: {
        ...prev.theme,
        ...(patch.primaryBackground ? { primaryBackground: patch.primaryBackground } : {}),
        ...(patch.primaryForeground ? { primaryForeground: patch.primaryForeground } : {}),
        ...(patch.secondaryBackground ? { secondaryBackground: patch.secondaryBackground } : {}),
        ...(patch.secondaryForeground ? { secondaryForeground: patch.secondaryForeground } : {}),
        ...(patch.neutralBackground ? { neutralBackground: patch.neutralBackground } : {}),
        ...(patch.neutralForeground ? { neutralForeground: patch.neutralForeground } : {}),
        ...(patch.bodyForeground ? { bodyForeground: patch.bodyForeground } : {}),
        ...(patch.btnPrimaryBackground ? { btnPrimaryBackground: patch.btnPrimaryBackground } : {}),
        ...(patch.btnPrimaryColor ? { btnPrimaryColor: patch.btnPrimaryColor } : {}),
      },
      visualOverrides: {
        ...prev.visualOverrides,
        productCard: {
          ...prev.visualOverrides.productCard,
          ...(patch.buyBtnBackground ? { buyBtnBackground: patch.buyBtnBackground } : {}),
          ...(patch.buyBtnForeground ? { buyBtnForeground: patch.buyBtnForeground } : {}),
        },
      },
    }));
  };

  const applyPaletteFrom = (source: StoreBlueprint) => {
    updateBp((prev) => ({
      ...prev,
      theme: { ...source.theme },
      visualOverrides: {
        ...prev.visualOverrides,
        announcement: { ...source.visualOverrides.announcement },
        header: { ...source.visualOverrides.header },
        productCard: { ...source.visualOverrides.productCard },
        footer: { ...source.visualOverrides.footer },
      },
    }));
  };

  const restoreOriginalPalette = () => applyPaletteFrom(baselineBp);

  const acceptReanalysis = (scope: "all" | "palette") => {
    if (!pendingReanalysis) return;
    if (scope === "all") {
      updateBp(() => pendingReanalysis.blueprint);
    } else {
      applyPaletteFrom(pendingReanalysis.blueprint);
    }
    setCurrentMode(pendingReanalysis.mode);
    setPendingReanalysis(null);
  };

  const suggestionsCount = bp.designInsights.filter((d) => d.severity === "suggestion").length;

  const handleDownloadBenefitsPng = () => {
    const svgText = generateBenefitsBannerSvgString(bp);
    const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 164;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, 1280, 164);
        canvas.toBlob((pngBlob) => {
          if (!pngBlob) return;
          const pngUrl = URL.createObjectURL(pngBlob);
          const a = document.createElement("a");
          a.href = pngUrl;
          a.download = `banner-beneficios-${slug}.png`;
          a.click();
          URL.revokeObjectURL(pngUrl);
        }, "image/png");
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      {/* Top Bar */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2 lg:gap-3 lg:px-5 lg:py-3">
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
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900">{bp.brand.name}</h1>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                Origem: {detectedPlatform}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${
                  currentMode === "gemini"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                <Sparkles className="h-3 w-3" />
                {currentMode === "gemini" ? "Analisado com IA" : "Modo heurístico"}
              </span>
              {hasUnsavedChanges && (
                <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  Alterações não salvas
                </span>
              )}
            </div>
            <p className="hidden max-w-md truncate text-xs text-slate-500 sm:block">{sourceUrl}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Modo do estúdio" className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              role="tab"
              aria-selected={activeTab === "preview"}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
                activeTab === "preview"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview ao Vivo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("compare")}
              role="tab"
              aria-selected={activeTab === "compare"}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
                activeTab === "compare"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Columns2 className="h-3.5 w-3.5" />
              Comparar
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("export")}
              role="tab"
              aria-selected={activeTab === "export"}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
                activeTab === "export"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
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
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white transition disabled:opacity-60 ${
              hasUnsavedChanges
                ? "bg-amber-600 hover:bg-amber-500"
                : "bg-slate-900 hover:bg-slate-800"
            }`}
          >
            {savedNotice ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Save className="h-3.5 w-3.5" />}
            {isSaving ? "Salvando..." : savedNotice ? "Salvo!" : "Salvar Alterações"}
          </button>

          <details className="relative lg:hidden">
            <summary className="flex min-h-[36px] cursor-pointer list-none items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700">
              Mais
            </summary>
            <div className="absolute right-0 z-30 mt-1 flex w-56 flex-col gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              <button
                type="button"
                onClick={() => copyText("client-link", `${window.location.origin}/preview/${slug}`)}
                className="rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                {copiedKey === "client-link" ? "Link copiado!" : "Copiar link do cliente"}
              </button>
              <Link
                href={`/preview/${slug}`}
                target="_blank"
                className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Abrir prévia do cliente
              </Link>
            </div>
          </details>

          <button
            type="button"
            onClick={() => copyText("client-link", `${window.location.origin}/preview/${slug}`)}
            className="hidden lg:flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            {copiedKey === "client-link" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedKey === "client-link" ? "Link Copiado!" : "Copiar Link do Cliente"}
          </button>

          <Link
            href={`/preview/${slug}`}
            target="_blank"
            className="hidden lg:flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
          >
            Abrir prévia do cliente
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Abaixo de 1024px: alterna entre editar e visualizar */}
      {activeTab === "preview" && (
        <div role="tablist" aria-label="Painel" className="grid grid-cols-2 border-b border-slate-200 bg-white text-xs font-semibold lg:hidden">
          {(["edit", "view"] as const).map((pane) => (
            <button
              key={pane}
              type="button"
              role="tab"
              aria-selected={mobilePane === pane}
              onClick={() => setMobilePane(pane)}
              className={`min-h-[44px] ${mobilePane === pane ? "border-b-2 border-emerald-600 text-emerald-700" : "text-slate-500"}`}
            >
              {pane === "edit" ? "Editar" : "Visualizar"}
            </button>
          ))}
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Full Freedom Editor (recolhida em Comparar/Exportar) */}
        <aside
          className={`${
            activeTab !== "preview" ? "hidden" : mobilePane === "edit" ? "flex" : "hidden lg:flex"
          } w-full shrink-0 flex-col border-r border-slate-200 bg-white lg:w-96`}
        >
          {/* Sub-tab navigation */}
          <div role="tablist" aria-label="Seções do editor" className="grid grid-cols-4 border-b border-slate-200 bg-slate-50 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setEditorTab("insights")}
              role="tab"
              aria-selected={editorTab === "insights"}
              className={`relative flex flex-col items-center gap-1 py-2.5 ${
                editorTab === "insights"
                  ? "border-b-2 border-emerald-600 bg-white text-emerald-700"
                  : "text-slate-500 hover:text-slate-800"
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
              onClick={() => setEditorTab("colors")}
              role="tab"
              aria-selected={editorTab === "colors"}
              className={`flex flex-col items-center gap-1 py-2.5 ${
                editorTab === "colors"
                  ? "border-b-2 border-emerald-600 bg-white text-emerald-700"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Palette className="h-3.5 w-3.5" />
              <span>Cores/Botões</span>
            </button>
            <button
              type="button"
              onClick={() => setEditorTab("banners")}
              role="tab"
              aria-selected={editorTab === "banners"}
              className={`flex flex-col items-center gap-1 py-2.5 ${
                editorTab === "banners"
                  ? "border-b-2 border-emerald-600 bg-white text-emerald-700"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              <span>Banners</span>
            </button>
            <button
              type="button"
              onClick={() => setEditorTab("structure")}
              role="tab"
              aria-selected={editorTab === "structure"}
              className={`flex flex-col items-center gap-1 py-2.5 ${
                editorTab === "structure"
                  ? "border-b-2 border-emerald-600 bg-white text-emerald-700"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Seções</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 text-xs">
            {actionError && (
              <div
                role="alert"
                className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700"
              >
                {actionError}
              </div>
            )}

            {/* TAB 1: DIAGNÓSTICO, PALETA FIEL & MARCA */}
            {editorTab === "insights" && (
              <div className="space-y-4">

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">
                      Diagnóstico de Paleta &amp; Conversão
                    </span>
                    <button aria-label="Restaurar paleta original extraída"
                      type="button"
                      onClick={restoreOriginalPalette}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
                      title="Restaurar paleta original extraída"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Original
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleReanalyzeWithGemini}
                    disabled={isReanalyzing}
                    className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {isReanalyzing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {isReanalyzing
                      ? "Analisando identidade com Gemini 3.5..."
                      : "Reanalisar Identidade com Gemini 3.5"}
                  </button>

                  {pendingReanalysis && (
                    <div
                      role="alertdialog"
                      aria-label="Resultado da reanálise"
                      className="mb-3 rounded-lg border border-emerald-300 bg-emerald-50 p-2.5 text-xs text-emerald-900"
                    >
                      <p className="font-semibold">Reanálise pronta. Como aplicar?</p>
                      <p className="mt-0.5 text-emerald-800">
                        Nada é salvo até você clicar em Salvar. &quot;Substituir tudo&quot; descarta suas edições atuais.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => acceptReanalysis("palette")}
                          className="rounded-md bg-emerald-600 px-2 py-1 font-bold text-white hover:bg-emerald-500"
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
                          className="rounded-md border border-emerald-600 px-2 py-1 font-bold text-emerald-800 hover:bg-emerald-100"
                        >
                          Substituir tudo
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingReanalysis(null)}
                          className="rounded-md px-2 py-1 font-semibold text-slate-600 hover:bg-white"
                        >
                          Descartar
                        </button>
                      </div>
                    </div>
                  )}

                  {bp.designInsights.length === 0 ? (
                    <p className="text-slate-500">
                      Paleta fiel aplicada a partir do site original ({baselineTheme.primaryBackground}).
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {bp.designInsights.map((insight) => (
                        <div
                          key={insight.id}
                          className={`rounded-lg border p-2.5 ${
                            insight.severity === "suggestion"
                              ? "border-amber-200 bg-amber-50/70"
                              : "border-emerald-200 bg-emerald-50/60"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <AlertCircle
                              className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                                insight.severity === "suggestion"
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                              }`}
                            />
                            <div className="space-y-1">
                              <div className="font-bold text-slate-900">{insight.title}</div>
                              <p className="leading-relaxed text-slate-600">{insight.description}</p>
                              {insight.suggestedThemePatch && insight.actionLabel && (
                                <button
                                  type="button"
                                  onClick={() => applyInsightSuggestion(insight)}
                                  className="mt-1 inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                                >
                                  <Sparkles className="h-3 w-3 text-emerald-400" />
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

                <div className="space-y-2.5 rounded-xl border border-slate-200 p-3">
                  <div className="font-bold text-slate-800">Identidade da Marca</div>
                  <div>
                    <label className="mb-1 block text-slate-500">Nome da Loja</label>
                    <input
                      type="text"
                      value={bp.brand.name}
                      onChange={(e) =>
                        updateBp((prev) => ({
                          ...prev,
                          brand: { ...prev.brand, name: e.target.value },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-slate-500">URL da Logo</label>
                    <input
                      type="text"
                      value={bp.brand.logoUrl}
                      onChange={(e) =>
                        updateBp((prev) => ({
                          ...prev,
                          brand: { ...prev.brand, logoUrl: e.target.value },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-slate-500">Nicho / Segmento</label>
                    <input
                      type="text"
                      value={bp.brand.niche}
                      onChange={(e) =>
                        updateBp((prev) => ({
                          ...prev,
                          brand: { ...prev.brand, niche: e.target.value },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-slate-500">WhatsApp do Consultor (CTA)</label>
                    <input
                      type="text"
                      value={sellerWhatsapp}
                      onChange={(e) => {
                        setSellerWhatsapp(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="5511999999999"
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-slate-500">Tarja Informativa Superior</label>
                    <input
                      type="text"
                      value={bp.sections.announcementText}
                      onChange={(e) =>
                        updateBp((prev) => ({
                          ...prev,
                          sections: { ...prev.sections, announcementText: e.target.value },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CORES & BOTÕES (LIBERDADE TOTAL) */}
            {editorTab === "colors" && (
              <div className="space-y-4">
                <div className="space-y-2.5 rounded-xl border border-slate-200 p-3">
                  <div className="font-bold text-slate-800">8 Tokens de Cor (Tema LIME)</div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <ColorField
                      label="Cor Primária"
                      value={bp.theme.primaryBackground}
                      onChange={(v) =>
                        updateBp((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, primaryBackground: v },
                        }))
                      }
                    />
                    <ColorField
                      label="Texto s/ Primária"
                      value={bp.theme.primaryForeground}
                      contrastWith={bp.theme.primaryBackground}
                      onChange={(v) =>
                        updateBp((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, primaryForeground: v },
                        }))
                      }
                    />
                    <ColorField
                      label="Cor Secundária"
                      value={bp.theme.secondaryBackground}
                      onChange={(v) =>
                        updateBp((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, secondaryBackground: v },
                        }))
                      }
                    />
                    <ColorField
                      label="Texto s/ Secundária"
                      value={bp.theme.secondaryForeground}
                      contrastWith={bp.theme.secondaryBackground}
                      onChange={(v) =>
                        updateBp((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, secondaryForeground: v },
                        }))
                      }
                    />
                    <ColorField
                      label="Cor Neutra (Faixas)"
                      value={bp.theme.neutralBackground}
                      onChange={(v) =>
                        updateBp((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, neutralBackground: v },
                        }))
                      }
                    />
                    <ColorField
                      label="Texto s/ Neutra"
                      value={bp.theme.neutralForeground}
                      contrastWith={bp.theme.neutralBackground}
                      onChange={(v) =>
                        updateBp((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, neutralForeground: v },
                        }))
                      }
                    />
                    <ColorField
                      label="Fundo Padrão"
                      value={bp.theme.bodyBackground}
                      onChange={(v) =>
                        updateBp((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, bodyBackground: v },
                        }))
                      }
                    />
                    <ColorField
                      label="Texto s/ Fundo"
                      value={bp.theme.bodyForeground}
                      contrastWith={bp.theme.bodyBackground}
                      onChange={(v) =>
                        updateBp((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, bodyForeground: v },
                        }))
                      }
                    />
                  </div>
                </div>

                {/* Botões e Cards */}
                <div className="space-y-3 rounded-xl border border-slate-200 p-3">
                  <div className="font-bold text-slate-800">Botões (Primário, Secundário &amp; Comprar)</div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <ColorField
                      label="Botão Primário (Fundo)"
                      value={bp.theme.btnPrimaryBackground}
                      onChange={(v) =>
                        updateBp((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, btnPrimaryBackground: v },
                        }))
                      }
                    />
                    <ColorField
                      label="Botão Primário (Texto)"
                      value={bp.theme.btnPrimaryColor}
                      contrastWith={bp.theme.btnPrimaryBackground}
                      onChange={(v) =>
                        updateBp((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, btnPrimaryColor: v },
                        }))
                      }
                    />
                    <ColorField
                      label="Botão Secundário (Fundo)"
                      value={bp.theme.btnSecondaryBackground}
                      onChange={(v) =>
                        updateBp((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, btnSecondaryBackground: v },
                        }))
                      }
                    />
                    <ColorField
                      label="Botão Secundário (Texto)"
                      value={bp.theme.btnSecondaryColor}
                      contrastWith={bp.theme.btnSecondaryBackground}
                      onChange={(v) =>
                        updateBp((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, btnSecondaryColor: v },
                        }))
                      }
                    />
                  </div>

                  <label className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      checked={bp.theme.btnSecondaryOutline}
                      onChange={(e) =>
                        updateBp((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, btnSecondaryOutline: e.target.checked },
                        }))
                      }
                    />
                    <span className="font-medium text-slate-700">
                      Botão secundário com contorno (outline)
                    </span>
                  </label>

                  <div className="border-t border-slate-100 pt-2.5">
                    <div className="mb-2 font-semibold text-slate-700">Botão Comprar dos Produtos</div>
                    <div className="mb-2">
                      <label className="mb-1 block text-slate-500">Texto do Botão</label>
                      <input
                        type="text"
                        value={bp.visualOverrides.pageProduct.buyButtonText}
                        onChange={(e) =>
                          updateBp((prev) => ({
                            ...prev,
                            visualOverrides: {
                              ...prev.visualOverrides,
                              pageProduct: {
                                ...prev.visualOverrides.pageProduct,
                                buyButtonText: e.target.value,
                              },
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-900"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <ColorField
                        label="Comprar (Fundo)"
                        value={bp.visualOverrides.productCard.buyBtnBackground}
                        onChange={(v) =>
                          updateBp((prev) => ({
                            ...prev,
                            visualOverrides: {
                              ...prev.visualOverrides,
                              productCard: {
                                ...prev.visualOverrides.productCard,
                                buyBtnBackground: v,
                              },
                            },
                          }))
                        }
                      />
                      <ColorField
                        label="Comprar (Texto)"
                        value={bp.visualOverrides.productCard.buyBtnForeground}
                        contrastWith={bp.visualOverrides.productCard.buyBtnBackground}
                        onChange={(v) =>
                          updateBp((prev) => ({
                            ...prev,
                            visualOverrides: {
                              ...prev.visualOverrides,
                              productCard: {
                                ...prev.visualOverrides.productCard,
                                buyBtnForeground: v,
                              },
                            },
                          }))
                        }
                      />
                      <ColorField
                        label="Comprar (Borda)"
                        value={bp.visualOverrides.productCard.buyBtnBorder}
                        onChange={(v) =>
                          updateBp((prev) => ({
                            ...prev,
                            visualOverrides: {
                              ...prev.visualOverrides,
                              productCard: {
                                ...prev.visualOverrides.productCard,
                                buyBtnBorder: v,
                              },
                            },
                          }))
                        }
                      />
                      <ColorField
                        label="Fundo dos Cards"
                        value={bp.visualOverrides.productCard.cardBackground}
                        onChange={(v) =>
                          updateBp((prev) => ({
                            ...prev,
                            visualOverrides: {
                              ...prev.visualOverrides,
                              productCard: {
                                ...prev.visualOverrides.productCard,
                                cardBackground: v,
                              },
                            },
                          }))
                        }
                      />
                      <ColorField
                        label="Cor do Preço"
                        value={bp.visualOverrides.productCard.priceColor}
                        onChange={(v) =>
                          updateBp((prev) => ({
                            ...prev,
                            visualOverrides: {
                              ...prev.visualOverrides,
                              productCard: {
                                ...prev.visualOverrides.productCard,
                                priceColor: v,
                              },
                            },
                          }))
                        }
                      />
                      <ColorField
                        label="Preço Antigo"
                        value={bp.visualOverrides.productCard.oldPriceColor}
                        onChange={(v) =>
                          updateBp((prev) => ({
                            ...prev,
                            visualOverrides: {
                              ...prev.visualOverrides,
                              productCard: {
                                ...prev.visualOverrides.productCard,
                                oldPriceColor: v,
                              },
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Tarja, Cabeçalho & Rodapé */}
                <div className="space-y-2.5 rounded-xl border border-slate-200 p-3">
                  <div className="font-bold text-slate-800">Tarja, Cabeçalho &amp; Rodapé</div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <ColorField
                      label="Tarja (Fundo)"
                      value={bp.visualOverrides.announcement.background}
                      onChange={(v) =>
                        updateBp((prev) => ({
                          ...prev,
                          visualOverrides: {
                            ...prev.visualOverrides,
                            announcement: { ...prev.visualOverrides.announcement, background: v },
                          },
                        }))
                      }
                    />
                    <ColorField
                      label="Tarja (Texto)"
                      value={bp.visualOverrides.announcement.foreground}
                      contrastWith={bp.visualOverrides.announcement.background}
                      onChange={(v) =>
                        updateBp((prev) => ({
                          ...prev,
                          visualOverrides: {
                            ...prev.visualOverrides,
                            announcement: { ...prev.visualOverrides.announcement, foreground: v },
                          },
                        }))
                      }
                    />
                    <ColorField
                      label="Cabeçalho (Fundo)"
                      value={bp.visualOverrides.header.background}
                      onChange={(v) =>
                        updateBp((prev) => ({
                          ...prev,
                          visualOverrides: {
                            ...prev.visualOverrides,
                            header: { ...prev.visualOverrides.header, background: v },
                          },
                        }))
                      }
                    />
                    <ColorField
                      label="Cabeçalho (Texto)"
                      value={bp.visualOverrides.header.foreground}
                      contrastWith={bp.visualOverrides.header.background}
                      onChange={(v) =>
                        updateBp((prev) => ({
                          ...prev,
                          visualOverrides: {
                            ...prev.visualOverrides,
                            header: { ...prev.visualOverrides.header, foreground: v },
                          },
                        }))
                      }
                    />
                    <ColorField
                      label="Rodapé (Fundo)"
                      value={bp.visualOverrides.footer.background}
                      onChange={(v) =>
                        updateBp((prev) => ({
                          ...prev,
                          visualOverrides: {
                            ...prev.visualOverrides,
                            footer: { ...prev.visualOverrides.footer, background: v },
                          },
                        }))
                      }
                    />
                    <ColorField
                      label="Rodapé (Texto)"
                      value={bp.visualOverrides.footer.foreground}
                      contrastWith={bp.visualOverrides.footer.background}
                      onChange={(v) =>
                        updateBp((prev) => ({
                          ...prev,
                          visualOverrides: {
                            ...prev.visualOverrides,
                            footer: { ...prev.visualOverrides.footer, foreground: v },
                          },
                        }))
                      }
                    />
                    <ColorField
                      label="Faixa Legal (Fundo)"
                      value={bp.visualOverrides.footer.legalBackground}
                      onChange={(v) =>
                        updateBp((prev) => ({
                          ...prev,
                          visualOverrides: {
                            ...prev.visualOverrides,
                            footer: { ...prev.visualOverrides.footer, legalBackground: v },
                          },
                        }))
                      }
                    />
                    <ColorField
                      label="Faixa Legal (Texto)"
                      value={bp.visualOverrides.footer.legalForeground}
                      contrastWith={bp.visualOverrides.footer.legalBackground}
                      onChange={(v) =>
                        updateBp((prev) => ({
                          ...prev,
                          visualOverrides: {
                            ...prev.visualOverrides,
                            footer: { ...prev.visualOverrides.footer, legalForeground: v },
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: BANNERS (HERO CAROUSEL, SLIM, MOOD, CAMPANHA) */}
            {editorTab === "banners" && (
              <div className="space-y-4">
                <div className="space-y-3 rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Slides do Banner Principal</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateBp((prev) => ({
                          ...prev,
                          sections: {
                            ...prev.sections,
                            heroSlides: [
                              ...prev.sections.heroSlides,
                              {
                                id: `slide-${Date.now()}`,
                                imageUrl: prev.sections.hero.imageUrl,
                                headline: `Novidades ${prev.brand.name}`,
                                subheadline: "Confira os lançamentos exclusivos da temporada.",
                                ctaText: "Ver Coleção",
                                ctaHref: "#vitrines",
                                mode: "editorial",
                                enabled: true,
                              },
                            ],
                          },
                        }))
                      }
                      className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      <Plus className="h-3 w-3" />
                      Slide
                    </button>
                  </div>

                  {bp.sections.heroSlides.map((slide, idx) => (
                    <div key={slide.id} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={slide.enabled}
                            onChange={(e) =>
                              updateBp((prev) => ({
                                ...prev,
                                sections: {
                                  ...prev.sections,
                                  heroSlides: prev.sections.heroSlides.map((s, i) =>
                                    i === idx ? { ...s, enabled: e.target.checked } : s
                                  ),
                                },
                              }))
                            }
                          />
                          Slide {idx + 1}
                        </label>
                        {bp.sections.heroSlides.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              updateBp((prev) => ({
                                ...prev,
                                sections: {
                                  ...prev.sections,
                                  heroSlides: prev.sections.heroSlides.filter((_, i) => i !== idx),
                                },
                              }))
                            }
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-slate-500">Modo do Banner</label>
                        <select
                          value={slide.mode}
                          onChange={(e) =>
                            updateBp((prev) => ({
                              ...prev,
                              sections: {
                                ...prev.sections,
                                heroSlides: prev.sections.heroSlides.map((s, i) =>
                                  i === idx
                                    ? { ...s, mode: e.target.value as "artwork" | "editorial" }
                                    : s
                                ),
                              },
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-800"
                        >
                          <option value="artwork">Arte Original (sem texto por cima)</option>
                          <option value="editorial">Editorial (título + botão CTA)</option>
                        </select>
                      </div>

                      <AiImageSlot
                        previewId={id}
                        label={`Imagem do Slide ${idx + 1}`}
                        value={slide.imageUrl}
                        defaultAspectRatio="16:9"
                        minRecommendedWidth={1000}
                        onChange={(nextUrl) =>
                          updateBp((prev) => ({
                            ...prev,
                            sections: {
                              ...prev.sections,
                              hero: idx === 0 ? { ...prev.sections.hero, imageUrl: nextUrl } : prev.sections.hero,
                              heroSlides: prev.sections.heroSlides.map((s, i) =>
                                i === idx ? { ...s, imageUrl: nextUrl } : s
                              ),
                            },
                          }))
                        }
                      />

                      {slide.mode === "editorial" && (
                        <>
                          <input
                            type="text"
                            value={slide.headline}
                            placeholder="Título do Banner"
                            onChange={(e) =>
                              updateBp((prev) => ({
                                ...prev,
                                sections: {
                                  ...prev.sections,
                                  heroSlides: prev.sections.heroSlides.map((s, i) =>
                                    i === idx ? { ...s, headline: e.target.value } : s
                                  ),
                                },
                              }))
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-800"
                          />
                          <input
                            type="text"
                            value={slide.subheadline}
                            placeholder="Subtítulo"
                            onChange={(e) =>
                              updateBp((prev) => ({
                                ...prev,
                                sections: {
                                  ...prev.sections,
                                  heroSlides: prev.sections.heroSlides.map((s, i) =>
                                    i === idx ? { ...s, subheadline: e.target.value } : s
                                  ),
                                },
                              }))
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-800"
                          />
                          <input
                            type="text"
                            value={slide.ctaText}
                            placeholder="Texto do Botão"
                            onChange={(e) =>
                              updateBp((prev) => ({
                                ...prev,
                                sections: {
                                  ...prev.sections,
                                  heroSlides: prev.sections.heroSlides.map((s, i) =>
                                    i === idx ? { ...s, ctaText: e.target.value } : s
                                  ),
                                },
                              }))
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-800"
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Banner de Benefícios (Tarja Informativa) */}
                <div className="space-y-2.5 rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800">Tarja de Benefícios</span>
                      <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600">
                        Tarja Informativa
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadBenefitsPng}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-500"
                    >
                      <Download className="h-3 w-3" />
                      Baixar PNG
                    </button>
                  </div>
                  <select
                    value={bp.sections.benefitsBanner?.mode ?? "generated-art"}
                    onChange={(e) =>
                      updateBp((prev) => ({
                        ...prev,
                        sections: {
                          ...prev.sections,
                          benefitsBanner: {
                            backgroundColor:
                              prev.sections.benefitsBanner?.backgroundColor ??
                              prev.theme.neutralBackground,
                            textColor:
                              prev.sections.benefitsBanner?.textColor ??
                              prev.theme.neutralForeground,
                            siteImageUrls: prev.sections.benefitsBanner?.siteImageUrls ?? [],
                            ...prev.sections.benefitsBanner,
                            mode: e.target.value as
                              | "site-images"
                              | "custom-image"
                              | "generated-art"
                              | "cards",
                          },
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-slate-800"
                  >
                    {(bp.sections.benefitsBanner?.siteImageUrls?.length ?? 0) > 0 && (
                      <option value="site-images">Artes Extraídas do Site</option>
                    )}
                    <option value="custom-image">Imagem Única Personalizada / IA</option>
                    <option value="generated-art">Arte Banner Gerada (Irroba)</option>
                    <option value="cards">Cards Modulares</option>
                  </select>

                  {/* Controles de dimensionamento da Tarja */}
                  <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>Dimensionamento da Tarja</span>
                      <label className="flex items-center gap-1 text-xs font-medium text-slate-600">
                        <input
                          type="checkbox"
                          checked={Boolean(bp.sections.benefitsBanner?.fullWidth)}
                          onChange={(e) =>
                            updateBp((prev) => ({
                              ...prev,
                              sections: {
                                ...prev.sections,
                                benefitsBanner: {
                                  mode: prev.sections.benefitsBanner?.mode ?? "generated-art",
                                  backgroundColor:
                                    prev.sections.benefitsBanner?.backgroundColor ??
                                    prev.theme.neutralBackground,
                                  textColor:
                                    prev.sections.benefitsBanner?.textColor ??
                                    prev.theme.neutralForeground,
                                  siteImageUrls: prev.sections.benefitsBanner?.siteImageUrls ?? [],
                                  ...prev.sections.benefitsBanner,
                                  fullWidth: e.target.checked,
                                },
                              },
                            }))
                          }
                        />
                        Largura 100%
                      </label>
                    </div>

                    <div>
                      <div className="mb-0.5 flex justify-between text-xs text-slate-600">
                        <span>Altura máxima</span>
                        <strong className="font-mono text-slate-800">
                          {bp.sections.benefitsBanner?.maxHeightPx ?? 120}px
                        </strong>
                      </div>
                      <input
                        type="range"
                        min={36}
                        max={260}
                        step={4}
                        value={bp.sections.benefitsBanner?.maxHeightPx ?? 120}
                        onChange={(e) =>
                          updateBp((prev) => ({
                            ...prev,
                            sections: {
                              ...prev.sections,
                              benefitsBanner: {
                                mode: prev.sections.benefitsBanner?.mode ?? "generated-art",
                                backgroundColor:
                                  prev.sections.benefitsBanner?.backgroundColor ??
                                  prev.theme.neutralBackground,
                                textColor:
                                  prev.sections.benefitsBanner?.textColor ??
                                  prev.theme.neutralForeground,
                                siteImageUrls: prev.sections.benefitsBanner?.siteImageUrls ?? [],
                                ...prev.sections.benefitsBanner,
                                maxHeightPx: Number(e.target.value),
                              },
                            },
                          }))
                        }
                        className="w-full accent-emerald-600"
                      />
                    </div>

                    {!bp.sections.benefitsBanner?.fullWidth && (
                      <div>
                        <div className="mb-0.5 flex justify-between text-xs text-slate-600">
                          <span>Largura máxima</span>
                          <strong className="font-mono text-slate-800">
                            {bp.sections.benefitsBanner?.maxWidthPx ?? 1280}px
                          </strong>
                        </div>
                        <input
                          type="range"
                          min={640}
                          max={1600}
                          step={20}
                          value={bp.sections.benefitsBanner?.maxWidthPx ?? 1280}
                          onChange={(e) =>
                            updateBp((prev) => ({
                              ...prev,
                              sections: {
                                ...prev.sections,
                                benefitsBanner: {
                                  mode: prev.sections.benefitsBanner?.mode ?? "generated-art",
                                  backgroundColor:
                                    prev.sections.benefitsBanner?.backgroundColor ??
                                    prev.theme.neutralBackground,
                                  textColor:
                                    prev.sections.benefitsBanner?.textColor ??
                                    prev.theme.neutralForeground,
                                  siteImageUrls: prev.sections.benefitsBanner?.siteImageUrls ?? [],
                                  ...prev.sections.benefitsBanner,
                                  maxWidthPx: Number(e.target.value),
                                },
                              },
                            }))
                          }
                          className="w-full accent-emerald-600"
                        />
                      </div>
                    )}

                    <div>
                      <div className="mb-0.5 flex justify-between text-xs text-slate-600">
                        <span>Espaçamento vertical</span>
                        <strong className="font-mono text-slate-800">
                          {bp.sections.benefitsBanner?.paddingY ?? 14}px
                        </strong>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={48}
                        step={2}
                        value={bp.sections.benefitsBanner?.paddingY ?? 14}
                        onChange={(e) =>
                          updateBp((prev) => ({
                            ...prev,
                            sections: {
                              ...prev.sections,
                              benefitsBanner: {
                                mode: prev.sections.benefitsBanner?.mode ?? "generated-art",
                                backgroundColor:
                                  prev.sections.benefitsBanner?.backgroundColor ??
                                  prev.theme.neutralBackground,
                                textColor:
                                  prev.sections.benefitsBanner?.textColor ??
                                  prev.theme.neutralForeground,
                                siteImageUrls: prev.sections.benefitsBanner?.siteImageUrls ?? [],
                                ...prev.sections.benefitsBanner,
                                paddingY: Number(e.target.value),
                              },
                            },
                          }))
                        }
                        className="w-full accent-emerald-600"
                      />
                    </div>
                  </div>

                  {bp.sections.benefitsBanner?.mode === "custom-image" && (
                    <AiImageSlot
                      previewId={id}
                      label="Imagem da Tarja de Benefícios (21:9)"
                      value={bp.sections.benefitsBanner?.customImageUrl ?? ""}
                      defaultAspectRatio="21:9"
                      minRecommendedWidth={900}
                      onChange={(nextUrl) =>
                        updateBp((prev) => ({
                          ...prev,
                          sections: {
                            ...prev.sections,
                            benefitsBanner: {
                              mode: "custom-image",
                              backgroundColor:
                                prev.sections.benefitsBanner?.backgroundColor ??
                                prev.theme.neutralBackground,
                              textColor:
                                prev.sections.benefitsBanner?.textColor ??
                                prev.theme.neutralForeground,
                              siteImageUrls: prev.sections.benefitsBanner?.siteImageUrls ?? [],
                              ...prev.sections.benefitsBanner,
                              customImageUrl: nextUrl,
                            },
                          },
                        }))
                      }
                    />
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <ColorField
                      label="Fundo da Faixa"
                      value={
                        bp.sections.benefitsBanner?.backgroundColor ?? bp.theme.neutralBackground
                      }
                      onChange={(v) =>
                        updateBp((prev) => ({
                          ...prev,
                          sections: {
                            ...prev.sections,
                            benefitsBanner: {
                              mode: prev.sections.benefitsBanner?.mode ?? "generated-art",
                              textColor:
                                prev.sections.benefitsBanner?.textColor ??
                                prev.theme.neutralForeground,
                              siteImageUrls: prev.sections.benefitsBanner?.siteImageUrls ?? [],
                              ...prev.sections.benefitsBanner,
                              backgroundColor: v,
                            },
                          },
                        }))
                      }
                    />
                    <ColorField
                      label="Texto da Arte"
                      value={bp.sections.benefitsBanner?.textColor ?? bp.theme.neutralForeground}
                      onChange={(v) =>
                        updateBp((prev) => ({
                          ...prev,
                          sections: {
                            ...prev.sections,
                            benefitsBanner: {
                              mode: prev.sections.benefitsBanner?.mode ?? "generated-art",
                              backgroundColor:
                                prev.sections.benefitsBanner?.backgroundColor ??
                                prev.theme.neutralBackground,
                              siteImageUrls: prev.sections.benefitsBanner?.siteImageUrls ?? [],
                              ...prev.sections.benefitsBanner,
                              textColor: v,
                            },
                          },
                        }))
                      }
                    />
                  </div>

                  {bp.sections.benefitsBanner?.mode !== "site-images" &&
                    bp.sections.benefitsBanner?.mode !== "custom-image" && (
                      <div className="space-y-1.5 pt-1">
                        {bp.sections.benefits.slice(0, 4).map((b, bIdx) => (
                          <div key={bIdx} className="grid grid-cols-2 gap-1.5">
                            <input
                              type="text"
                              value={b.title}
                              onChange={(e) =>
                                updateBp((prev) => ({
                                  ...prev,
                                  sections: {
                                    ...prev.sections,
                                    benefits: prev.sections.benefits.map((item, idx) =>
                                      idx === bIdx ? { ...item, title: e.target.value } : item
                                    ),
                                  },
                                }))
                              }
                              className="rounded border border-slate-200 px-2 py-1 text-xs"
                            />
                            <input
                              type="text"
                              value={b.subtitle}
                              onChange={(e) =>
                                updateBp((prev) => ({
                                  ...prev,
                                  sections: {
                                    ...prev.sections,
                                    benefits: prev.sections.benefits.map((item, idx) =>
                                      idx === bIdx ? { ...item, subtitle: e.target.value } : item
                                    ),
                                  },
                                }))
                              }
                              className="rounded border border-slate-200 px-2 py-1 text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                </div>

                {/* Banner Slim */}
                {bp.sections.slimBanner && (
                  <div className="space-y-2.5 rounded-xl border border-slate-200 p-3">
                    <label className="flex items-center justify-between font-bold text-slate-800">
                      <span>Banner Slim Promocional</span>
                      <input
                        type="checkbox"
                        checked={bp.sections.slimBanner.enabled}
                        onChange={(e) =>
                          updateBp((prev) => ({
                            ...prev,
                            sections: {
                              ...prev.sections,
                              slimBanner: prev.sections.slimBanner
                                ? { ...prev.sections.slimBanner, enabled: e.target.checked }
                                : undefined,
                            },
                          }))
                        }
                      />
                    </label>
                    <select
                      value={bp.sections.slimBanner.mode}
                      onChange={(e) =>
                        updateBp((prev) => ({
                          ...prev,
                          sections: {
                            ...prev.sections,
                            slimBanner: prev.sections.slimBanner
                              ? {
                                  ...prev.sections.slimBanner,
                                  mode: e.target.value as "image" | "designed",
                                }
                              : undefined,
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-slate-800"
                    >
                      <option value="designed">Faixa Desenhada (Editável)</option>
                      <option value="image">Imagem Banner Slim</option>
                    </select>
                    {bp.sections.slimBanner.mode === "image" ? (
                      <AiImageSlot
                        previewId={id}
                        label="Arte Banner Slim (21:9)"
                        value={bp.sections.slimBanner.imageUrl}
                        defaultAspectRatio="21:9"
                        minRecommendedWidth={1000}
                        onChange={(nextUrl) =>
                          updateBp((prev) => ({
                            ...prev,
                            sections: {
                              ...prev.sections,
                              slimBanner: prev.sections.slimBanner
                                ? { ...prev.sections.slimBanner, imageUrl: nextUrl }
                                : undefined,
                            },
                          }))
                        }
                      />
                    ) : (
                      <>
                        <input
                          type="text"
                          value={bp.sections.slimBanner.headline}
                          onChange={(e) =>
                            updateBp((prev) => ({
                              ...prev,
                              sections: {
                                ...prev.sections,
                                slimBanner: prev.sections.slimBanner
                                  ? { ...prev.sections.slimBanner, headline: e.target.value }
                                  : undefined,
                              },
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <ColorField
                            label="Fundo"
                            value={bp.sections.slimBanner.backgroundColor}
                            onChange={(v) =>
                              updateBp((prev) => ({
                                ...prev,
                                sections: {
                                  ...prev.sections,
                                  slimBanner: prev.sections.slimBanner
                                    ? { ...prev.sections.slimBanner, backgroundColor: v }
                                    : undefined,
                                },
                              }))
                            }
                          />
                          <ColorField
                            label="Texto"
                            value={bp.sections.slimBanner.textColor}
                            onChange={(v) =>
                              updateBp((prev) => ({
                                ...prev,
                                sections: {
                                  ...prev.sections,
                                  slimBanner: prev.sections.slimBanner
                                    ? { ...prev.sections.slimBanner, textColor: v }
                                    : undefined,
                                },
                              }))
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Banner Secundário */}
                {bp.sections.secondaryBanner && (
                  <div className="space-y-2.5 rounded-xl border border-slate-200 p-3">
                    <label className="flex items-center justify-between font-bold text-slate-800">
                      <span>Banner Secundário de Campanha</span>
                      <input
                        type="checkbox"
                        checked={bp.sections.secondaryBanner.enabled}
                        onChange={(e) =>
                          updateBp((prev) => ({
                            ...prev,
                            sections: {
                              ...prev.sections,
                              secondaryBanner: prev.sections.secondaryBanner
                                ? { ...prev.sections.secondaryBanner, enabled: e.target.checked }
                                : undefined,
                            },
                          }))
                        }
                      />
                    </label>
                    <select
                      value={bp.sections.secondaryBanner.mode}
                      onChange={(e) =>
                        updateBp((prev) => ({
                          ...prev,
                          sections: {
                            ...prev.sections,
                            secondaryBanner: prev.sections.secondaryBanner
                              ? {
                                  ...prev.sections.secondaryBanner,
                                  mode: e.target.value as "artwork" | "editorial",
                                }
                              : undefined,
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5"
                    >
                      <option value="artwork">Arte Completa (Imagem Larga)</option>
                      <option value="editorial">Editorial (Imagem + Texto + Botão)</option>
                    </select>
                    <AiImageSlot
                      previewId={id}
                      label="Imagem Banner Secundário"
                      value={bp.sections.secondaryBanner.imageUrl}
                      defaultAspectRatio="16:9"
                      minRecommendedWidth={900}
                      onChange={(nextUrl) =>
                        updateBp((prev) => ({
                          ...prev,
                          sections: {
                            ...prev.sections,
                            secondaryBanner: prev.sections.secondaryBanner
                              ? { ...prev.sections.secondaryBanner, imageUrl: nextUrl }
                              : undefined,
                          },
                        }))
                      }
                    />
                    {bp.sections.secondaryBanner.mode === "editorial" && (
                      <>
                        <input
                          type="text"
                          value={bp.sections.secondaryBanner.headline}
                          onChange={(e) =>
                            updateBp((prev) => ({
                              ...prev,
                              sections: {
                                ...prev.sections,
                                secondaryBanner: prev.sections.secondaryBanner
                                  ? { ...prev.sections.secondaryBanner, headline: e.target.value }
                                  : undefined,
                              },
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
                        />
                        <input
                          type="text"
                          value={bp.sections.secondaryBanner.ctaText}
                          onChange={(e) =>
                            updateBp((prev) => ({
                              ...prev,
                              sections: {
                                ...prev.sections,
                                secondaryBanner: prev.sections.secondaryBanner
                                  ? { ...prev.sections.secondaryBanner, ctaText: e.target.value }
                                  : undefined,
                              },
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
                        />
                      </>
                    )}
                  </div>
                )}

                {/* Mosaico Mood / Categorias */}
                <div className="space-y-2.5 rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Galeria Editorial (Mood / Coleções)</span>
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">
                      Conteúdo HTML
                    </span>
                  </div>
                  <input
                    type="text"
                    value={bp.sections.moodSectionTitle}
                    onChange={(e) =>
                      updateBp((prev) => ({
                        ...prev,
                        sections: { ...prev.sections, moodSectionTitle: e.target.value },
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
                  />
                  {bp.sections.moodBanners.map((m, idx) => (
                    <div key={m.id} className="space-y-1.5 rounded-lg bg-slate-50 p-2">
                      <label className="flex items-center justify-between font-semibold text-slate-700">
                        <span>Card {idx + 1}</span>
                        <input
                          type="checkbox"
                          checked={m.enabled}
                          onChange={(e) =>
                            updateBp((prev) => ({
                              ...prev,
                              sections: {
                                ...prev.sections,
                                moodBanners: prev.sections.moodBanners.map((item, i) =>
                                  i === idx ? { ...item, enabled: e.target.checked } : item
                                ),
                              },
                            }))
                          }
                        />
                      </label>
                      <input
                        type="text"
                        value={m.title}
                        onChange={(e) =>
                          updateBp((prev) => ({
                            ...prev,
                            sections: {
                              ...prev.sections,
                              moodBanners: prev.sections.moodBanners.map((item, i) =>
                                i === idx ? { ...item, title: e.target.value } : item
                              ),
                            },
                          }))
                        }
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1"
                      />
                      <AiImageSlot
                        previewId={id}
                        label={`Foto Card ${idx + 1} (3:4)`}
                        value={m.imageUrl}
                        defaultAspectRatio="3:4"
                        minRecommendedWidth={500}
                        onChange={(nextUrl) =>
                          updateBp((prev) => ({
                            ...prev,
                            sections: {
                              ...prev.sections,
                              moodBanners: prev.sections.moodBanners.map((item, i) =>
                                i === idx ? { ...item, imageUrl: nextUrl } : item
                              ),
                            },
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: MANIPULAÇÃO DE SEÇÕES, LOOKBOOK, TIPOGRAFIA, CATEGORIAS & PRODUTOS */}
            {editorTab === "structure" && (
              <div className="space-y-4">
                {/* 1. Manipulador de Seções da Página Inicial */}
                <div className="space-y-2.5 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">Seções da Página Inicial</div>
                      <div className="text-xs text-slate-500">
                        Arraste, mova (↑/↓) ou oculte qualquer seção em tempo real
                      </div>
                    </div>
                    <button aria-label="Restaurar ordem padrão"
                      type="button"
                      onClick={resetSectionLayout}
                      title="Restaurar ordem padrão"
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Padrão
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {sectionLayout.map((sec, idx) => (
                      <div
                        key={sec.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", String(idx));
                          dragSectionIdxRef.current = idx;
                          setDragSectionIdx(idx);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          setDragOverIdx((prev) => (prev === idx ? prev : idx));
                        }}
                        onDragLeave={(e) => {
                          if (
                            e.relatedTarget instanceof Node &&
                            e.currentTarget.contains(e.relatedTarget)
                          ) {
                            return;
                          }
                          setDragOverIdx((prev) => (prev === idx ? null : prev));
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const raw = e.dataTransfer.getData("text/plain");
                          const from =
                            raw !== "" && !Number.isNaN(Number(raw))
                              ? Number(raw)
                              : dragSectionIdxRef.current;
                          if (
                            from !== null &&
                            from >= 0 &&
                            from < sectionLayout.length &&
                            from !== idx
                          ) {
                            moveSection(from, idx);
                          }
                          dragSectionIdxRef.current = null;
                          setDragSectionIdx(null);
                          setDragOverIdx(null);
                        }}
                        onDragEnd={() => {
                          dragSectionIdxRef.current = null;
                          setDragSectionIdx(null);
                          setDragOverIdx(null);
                        }}
                        className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 transition ${
                          sec.enabled ? "text-slate-800" : "text-slate-400"
                        } ${
                          dragOverIdx === idx && dragSectionIdx !== idx
                            ? "border-emerald-500 bg-emerald-50"
                            : sec.enabled
                              ? "border-slate-200 bg-white"
                              : "border-dashed border-slate-200 bg-slate-100/80"
                        } ${dragSectionIdx === idx ? "opacity-50 ring-2 ring-emerald-400" : ""}`}
                      >
                        <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-slate-400" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold leading-tight">{sec.label}</div>
                          <div className="truncate text-xs font-medium uppercase tracking-wide text-slate-400">
                            {sec.irrobaModule}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <button
                            type="button"
                            draggable={false}
                            disabled={idx === 0}
                            onClick={() => moveSection(idx, idx - 1)}
                            title="Mover para cima"
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            draggable={false}
                            disabled={idx === sectionLayout.length - 1}
                            onClick={() => moveSection(idx, idx + 1)}
                            title="Mover para baixo"
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            draggable={false}
                            onClick={() => toggleSection(sec.id)}
                            title={sec.enabled ? "Ocultar seção" : "Exibir seção"}
                            className={`rounded p-1 ${
                              sec.enabled
                                ? "text-emerald-600 hover:bg-emerald-50"
                                : "text-slate-400 hover:bg-slate-200"
                            }`}
                          >
                            {sec.enabled ? (
                              <Eye className="h-3.5 w-3.5" />
                            ) : (
                              <EyeOff className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Editor do Lookbook & Manifesto (Conteúdo HTML) */}
                <div className="space-y-2.5 rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Lookbook &amp; Manifesto</span>
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">
                      Conteúdo HTML
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="Etiqueta (ex: 01 / Manifesto)"
                    value={bp.sections.lookbook?.eyebrow ?? "01 / Manifesto"}
                    onChange={(e) =>
                      updateBp((prev) => ({
                        ...prev,
                        sections: {
                          ...prev.sections,
                          lookbook: {
                            mainImageUrl: prev.sections.lookbook?.mainImageUrl ?? "",
                            insetImageUrl: prev.sections.lookbook?.insetImageUrl ?? "",
                            ...prev.sections.lookbook,
                            eyebrow: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
                  />
                  <input
                    type="text"
                    placeholder="Título do Manifesto"
                    value={bp.sections.lookbook?.headline ?? bp.sections.promoStripText}
                    onChange={(e) =>
                      updateBp((prev) => ({
                        ...prev,
                        sections: {
                          ...prev.sections,
                          lookbook: {
                            eyebrow: prev.sections.lookbook?.eyebrow ?? "01 / Manifesto",
                            mainImageUrl: prev.sections.lookbook?.mainImageUrl ?? "",
                            insetImageUrl: prev.sections.lookbook?.insetImageUrl ?? "",
                            ...prev.sections.lookbook,
                            headline: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
                  />
                  <textarea
                    rows={2}
                    placeholder="Texto institucional / narrativa da marca"
                    value={bp.sections.lookbook?.description ?? bp.footer.aboutText}
                    onChange={(e) =>
                      updateBp((prev) => ({
                        ...prev,
                        sections: {
                          ...prev.sections,
                          lookbook: {
                            eyebrow: prev.sections.lookbook?.eyebrow ?? "01 / Manifesto",
                            mainImageUrl: prev.sections.lookbook?.mainImageUrl ?? "",
                            insetImageUrl: prev.sections.lookbook?.insetImageUrl ?? "",
                            ...prev.sections.lookbook,
                            description: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
                  />
                  <AiImageSlot
                    previewId={id}
                    label="Foto Principal do Lookbook (16:9)"
                    value={
                      bp.sections.lookbook?.mainImageUrl ||
                      bp.sections.secondaryBanner?.imageUrl ||
                      bp.sections.hero.imageUrl
                    }
                    defaultAspectRatio="16:9"
                    minRecommendedWidth={800}
                    onChange={(nextUrl) =>
                      updateBp((prev) => ({
                        ...prev,
                        sections: {
                          ...prev.sections,
                          lookbook: {
                            eyebrow: prev.sections.lookbook?.eyebrow ?? "01 / Manifesto",
                            insetImageUrl: prev.sections.lookbook?.insetImageUrl ?? "",
                            ...prev.sections.lookbook,
                            mainImageUrl: nextUrl,
                          },
                        },
                      }))
                    }
                  />
                  <AiImageSlot
                    previewId={id}
                    label="Foto Detalhe Sobreposta (1:1)"
                    value={
                      bp.sections.lookbook?.insetImageUrl ||
                      bp.products[1]?.imageUrl ||
                      bp.products[0]?.imageUrl ||
                      ""
                    }
                    defaultAspectRatio="1:1"
                    minRecommendedWidth={500}
                    onChange={(nextUrl) =>
                      updateBp((prev) => ({
                        ...prev,
                        sections: {
                          ...prev.sections,
                          lookbook: {
                            eyebrow: prev.sections.lookbook?.eyebrow ?? "01 / Manifesto",
                            mainImageUrl: prev.sections.lookbook?.mainImageUrl ?? "",
                            ...prev.sections.lookbook,
                            insetImageUrl: nextUrl,
                          },
                        },
                      }))
                    }
                  />
                </div>

                {/* 3. Barra de Aviso Superior */}
                <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                  <div className="font-bold text-slate-800">Barra de Aviso do Topo</div>
                  <input
                    type="text"
                    value={bp.sections.announcementText}
                    onChange={(e) =>
                      updateBp((prev) => ({
                        ...prev,
                        sections: { ...prev.sections, announcementText: e.target.value },
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
                  />
                </div>

                <div className="space-y-2.5 rounded-xl border border-slate-200 p-3">
                  <div className="font-bold text-slate-800">Tipografia &amp; Arredondamento</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-slate-500">Fonte Títulos</label>
                      <select
                        value={bp.theme.headingFont}
                        onChange={(e) =>
                          updateBp((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, headingFont: e.target.value },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5"
                      >
                        {!FONT_OPTIONS.includes(bp.theme.headingFont) && (
                          <option value={bp.theme.headingFont}>{bp.theme.headingFont}</option>
                        )}
                        {FONT_OPTIONS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-slate-500">Fonte Corpo</label>
                      <select
                        value={bp.theme.bodyFont}
                        onChange={(e) =>
                          updateBp((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, bodyFont: e.target.value },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5"
                      >
                        {!FONT_OPTIONS.includes(bp.theme.bodyFont) && (
                          <option value={bp.theme.bodyFont}>{bp.theme.bodyFont}</option>
                        )}
                        {FONT_OPTIONS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-slate-500">Arredondamento</label>
                      <select
                        value={bp.theme.radius}
                        onChange={(e) =>
                          updateBp((prev) => ({
                            ...prev,
                            theme: {
                              ...prev.theme,
                              radius: e.target.value as StoreBlueprint["theme"]["radius"],
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5"
                      >
                        <option value="none">Sem arredondamento</option>
                        <option value="small">Pequeno (6px)</option>
                        <option value="medium">Médio (12px)</option>
                        <option value="large">Grande (24px)</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-slate-500">Cabeçalho Layout</label>
                      <select
                        value={bp.theme.headerLayout}
                        onChange={(e) =>
                          updateBp((prev) => ({
                            ...prev,
                            theme: {
                              ...prev.theme,
                              headerLayout: e.target.value as StoreBlueprint["theme"]["headerLayout"],
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5"
                      >
                        <option value="layout-1">Layout 1 (Linha)</option>
                        <option value="layout-2">Layout 2 (Centralizado)</option>
                        <option value="layout-3">Layout 3 (Compacto)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-slate-500">Cabeçalho Posição</label>
                      <select
                        value={bp.visualOverrides.header.position}
                        onChange={(e) =>
                          updateBp((prev) => ({
                            ...prev,
                            visualOverrides: {
                              ...prev.visualOverrides,
                              header: {
                                ...prev.visualOverrides.header,
                                position: e.target.value as "default" | "sticky" | "overlay",
                              },
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5"
                      >
                        <option value="default">Padrão</option>
                        <option value="sticky">Fixo ao rolar</option>
                        <option value="overlay">Fixo na tela</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-slate-500">Alinhamento Vitrines</label>
                      <select
                        value={bp.visualOverrides.productCard.titleAlign}
                        onChange={(e) =>
                          updateBp((prev) => ({
                            ...prev,
                            visualOverrides: {
                              ...prev.visualOverrides,
                              productCard: {
                                ...prev.visualOverrides.productCard,
                                titleAlign: e.target.value as "left" | "center" | "right",
                              },
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5"
                      >
                        <option value="left">Esquerda</option>
                        <option value="center">Centro</option>
                        <option value="right">Direita</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Menu de Categorias */}
                <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                  <div className="font-bold text-slate-800">Categorias do Menu</div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Nova categoria..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const label = newCategoryName.trim();
                        if (!label) return;
                        updateBp((prev) => ({
                          ...prev,
                          sections: {
                            ...prev.sections,
                            categories: [
                              ...prev.sections.categories,
                              { label, href: `#cat-${prev.sections.categories.length + 1}` },
                            ],
                          },
                        }));
                        setNewCategoryName("");
                      }}
                      className="rounded-lg bg-slate-900 px-2.5 py-1 font-semibold text-white"
                    >
                      +
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {bp.sections.categories.map((cat, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={cat.label}
                          onChange={(e) =>
                            updateBp((prev) => ({
                              ...prev,
                              sections: {
                                ...prev.sections,
                                categories: prev.sections.categories.map((c, i) =>
                                  i === idx ? { ...c, label: e.target.value } : c
                                ),
                              },
                            }))
                          }
                          className="flex-1 rounded border border-slate-200 px-2 py-1"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateBp((prev) => ({
                              ...prev,
                              sections: {
                                ...prev.sections,
                                categories: prev.sections.categories.filter((_, i) => i !== idx),
                              },
                            }))
                          }
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vitrines & Produtos */}
                <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                  <div className="font-bold text-slate-800">
                    Vitrines &amp; Produtos ({bp.products.filter((p) => p.visible !== false).length}/
                    {bp.products.length})
                  </div>
                  {bp.sections.showcases.map((sc, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={sc.title}
                      onChange={(e) =>
                        updateBp((prev) => ({
                          ...prev,
                          sections: {
                            ...prev.sections,
                            showcases: prev.sections.showcases.map((item, i) =>
                              i === idx ? { ...item, title: e.target.value } : item
                            ),
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 font-medium"
                    />
                  ))}
                  <div className="max-h-48 space-y-1.5 overflow-y-auto pt-1">
                    {bp.products.map((prod) => (
                      <label
                        key={prod.id}
                        className="flex items-center gap-2 rounded border border-slate-100 bg-slate-50 px-2 py-1.5"
                      >
                        <input
                          type="checkbox"
                          checked={prod.visible !== false}
                          onChange={(e) =>
                            updateBp((prev) => ({
                              ...prev,
                              products: prev.products.map((p) =>
                                p.id === prod.id ? { ...p, visible: e.target.checked } : p
                              ),
                            }))
                          }
                        />
                        <span className="flex-1 truncate text-xs text-slate-700">
                          {prod.title}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Center/Right Pane */}
        {activeTab === "preview" ? (
          <main className={`${mobilePane === "view" ? "flex" : "hidden lg:flex"} flex-1 flex-col overflow-hidden p-2 lg:p-4`}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Prévia instantânea fiel ao Tema LIME (alterações refletem na hora — clique em Salvar para atualizar a prévia do cliente)
              </span>
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setDevice("desktop")}
                  className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold ${
                    device === "desktop" ? "bg-slate-900 text-white" : "text-slate-600"
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setDevice("mobile")}
                  className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold ${
                    device === "mobile" ? "bg-slate-900 text-white" : "text-slate-600"
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  Mobile
                </button>
              </div>
            </div>

            <div className="flex flex-1 items-start justify-center overflow-auto rounded-xl border border-slate-200 bg-slate-200/70 p-3">
              <iframe
                srcDoc={liveHtml}
                title="Preview Irroba LIME"
                className={`h-full rounded-lg bg-white shadow-xl transition-all duration-300 ${
                  device === "mobile" ? "w-[390px] border-8 border-slate-800" : "w-full"
                }`}
              />
            </div>
          </main>
        ) : activeTab === "compare" ? (
          <main className="flex min-h-0 flex-1 overflow-hidden">
            <StoreCompareView
              storeName={bp.brand.name}
              sourceUrl={sourceUrl}
              detectedPlatform={detectedPlatform}
              fullScreenshotPath={fullScreenshotPath}
              screenshotPath={screenshotPath}
              proposalSrcDoc={liveHtml}
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
        ) : null}
      </div>
    </div>
  );
}
