"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { computeUnsaved, type StudioSaveSnapshot } from "@/lib/client/unsavedChanges";
import { useLatest } from "@/lib/client/useLatest";
import { useTimeout } from "@/lib/client/useTimeout";
import { generateBenefitsBannerSvgString } from "@/lib/irroba-blocks/banner-art-generator";
import { compileIrrobaExport, compileStorefrontDocument } from "@/lib/irroba-blocks/compiler";
import {
  CUSTOM_SECTION_MODULE_LABELS,
  DEFAULT_SECTION_LAYOUT,
  getNormalizedSectionLayout,
  isBuiltinSectionKey,
  type CustomSection,
  type CustomSectionKind,
  type DesignInsight,
  type SectionConfig,
  type StoreBlueprint,
} from "@/lib/types/blueprint";
import { useTabs } from "@/components/ui/useTabs";
import { useCopyToClipboard } from "@/components/ui/useCopyToClipboard";
import { createCustomSection, newCustomSectionId } from "./customSections";
import { INSPECTOR_META, type InspectorSelection, type InspectorTargetId } from "./inspectorTargets";

export type EditorSubTab = "insights" | "colors" | "banners" | "structure";
const STUDIO_TABS = ["preview", "compare", "export"] as const;
const MOBILE_PANES = ["edit", "view"] as const;
const EDITOR_TABS: readonly EditorSubTab[] = ["insights", "colors", "banners", "structure"];

export interface StudioStateOptions {
  id: string;
  slug: string;
  generationMode: string;
  initialWhatsapp: string;
  initialBlueprint: StoreBlueprint;
}

/**
 * Estado e ações do Studio: blueprint em edição, save com snapshot (fase 3), reanálise,
 * abas (useTabs), seleção do Inspector e a ponte postMessage com o iframe em sandbox (fase 2).
 */
export function useStudioState({
  id,
  slug,
  generationMode,
  initialWhatsapp,
  initialBlueprint,
}: StudioStateOptions) {
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
  const [inspectMode, setInspectMode] = useState(true);
  const [selectedElement, setSelectedElement] = useState<InspectorSelection | null>(null);
  const [hoveredPreviewLabel, setHoveredPreviewLabel] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const { copiedKey, copy } = useCopyToClipboard(2000);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [dragSectionIdx, setDragSectionIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragSectionIdxRef = useRef<number | null>(null);
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);
  const sidebarScrollRef = useRef<HTMLDivElement | null>(null);
  // Estado atual lido após o await do save (edições feitas durante a requisição)
  const latestSnapshotRef = useLatest<StudioSaveSnapshot>({ bp, sellerWhatsapp, currentMode });
  const savedNoticeTimeout = useTimeout();

  // Estado da prévia que sobrevive à recompilação do srcDoc (antes ficava em window.name).
  const previewViewStateRef = useRef<{ scrollY?: number; slideIdx?: number }>({});

  // O iframe roda em sandbox sem allow-same-origin: a origem dele é "null" e não há como nomeá-la
  // no targetOrigin, por isso "*". O alvo é a contentWindow do nosso próprio iframe e o conteúdo
  // enviado (modo/seleção do inspetor) não é sensível.
  const postToPreview = useCallback((payload: Record<string, unknown>) => {
    try {
      previewIframeRef.current?.contentWindow?.postMessage(payload, "*");
    } catch {
      // ignore detached iframe
    }
  }, []);

  const selectAndFocusElement = useCallback(
    (next: InspectorSelection | null, scrollIntoView = false) => {
      setSelectedElement(next);
      postToPreview({ type: "irb-studio:set-active", selection: next, scrollIntoView });
      if (next) {
        setMobilePane("edit");
        sidebarScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [postToPreview]
  );

  const studioTabs = useTabs({ tabs: STUDIO_TABS, selected: activeTab, onSelect: setActiveTab });
  const mobileTabs = useTabs({ tabs: MOBILE_PANES, selected: mobilePane, onSelect: setMobilePane });
  const editorTabs = useTabs({
    tabs: EDITOR_TABS,
    selected: selectedElement ? null : editorTab,
    onSelect: (tab) => {
      selectAndFocusElement(null);
      setEditorTab(tab);
    },
  });
  const workspacePanelId = studioTabs.panelId("preview");
  const editorAsideId = mobileTabs.panelId("edit");
  const previewMainId = mobileTabs.panelId("view");
  const editorPanelId = editorTabs.panelId("insights");

  const hoverSidebarTarget = useCallback(
    (target: InspectorTargetId | InspectorSelection | null) => {
      if (!target) {
        postToPreview({ type: "irb-studio:hover-target", targetId: null });
        return;
      }
      if (typeof target === "string") {
        postToPreview({ type: "irb-studio:hover-target", targetId: target });
        return;
      }
      postToPreview({
        type: "irb-studio:hover-target",
        targetId: target.targetId,
        customSectionId: target.customSectionId ?? null,
      });
    },
    [postToPreview]
  );

  useEffect(() => {
    postToPreview({ type: "irb-studio:set-mode", inspectMode });
    if (!inspectMode) {
      setHoveredPreviewLabel(null);
    }
  }, [inspectMode, postToPreview]);

  const inspectModeRef = useLatest(inspectMode);
  const selectedElementRef = useLatest(selectedElement);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      // Com sandbox a origem é "null": a checagem é pela source (a janela do nosso iframe)
      if (
        !previewIframeRef.current ||
        e.source !== previewIframeRef.current.contentWindow ||
        !e.data ||
        typeof e.data !== "object"
      ) {
        return;
      }
      const msg = e.data as {
        type?: string;
        targetId?: InspectorTargetId | null;
        label?: string | null;
        productId?: string;
        showcaseIdx?: number;
        subIndex?: number;
        customSectionId?: string;
        scrollY?: unknown;
        slideIdx?: unknown;
      };
      if (msg.type === "irb-studio:ready") {
        postToPreview({
          type: "irb-studio:set-state",
          inspectMode: inspectModeRef.current,
          activeSelection: selectedElementRef.current,
          ...previewViewStateRef.current,
        });
      } else if (msg.type === "irb-studio:state") {
        const next = { ...previewViewStateRef.current };
        if (typeof msg.scrollY === "number" && Number.isFinite(msg.scrollY)) next.scrollY = msg.scrollY;
        if (typeof msg.slideIdx === "number" && Number.isFinite(msg.slideIdx)) next.slideIdx = msg.slideIdx;
        previewViewStateRef.current = next;
      } else if (msg.type === "irb-studio:hover") {
        setHoveredPreviewLabel(msg.label ?? null);
      } else if (msg.type === "irb-studio:select" && msg.targetId && INSPECTOR_META[msg.targetId]) {
        setSelectedElement({
          targetId: msg.targetId,
          label: msg.label ?? INSPECTOR_META[msg.targetId].title,
          productId: msg.productId,
          showcaseIdx: msg.showcaseIdx,
          subIndex: msg.subIndex,
          customSectionId: msg.customSectionId,
        });
        setMobilePane("edit");
        sidebarScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [postToPreview, inspectModeRef, selectedElementRef]);

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
  const liveHtml = useMemo(
    () => compileStorefrontDocument(deferredBp, undefined, { studioInspector: true }),
    [deferredBp]
  );
  const compareHtml = useMemo(
    () => (activeTab === "compare" ? compileStorefrontDocument(deferredBp) : ""),
    [activeTab, deferredBp]
  );
  // Pacote de export só é calculado na aba Exportar
  const compiled = useMemo(
    () => (activeTab === "export" ? compileIrrobaExport(bp) : null),
    [activeTab, bp]
  );
  const sectionLayout = useMemo(
    () => getNormalizedSectionLayout(bp.sections.layout, bp.sections.customSections),
    [bp.sections.layout, bp.sections.customSections]
  );

  const toSectionSelection = (sec: SectionConfig): InspectorSelection =>
    isBuiltinSectionKey(sec.id)
      ? { targetId: sec.id, label: sec.label }
      : { targetId: "custom-section", customSectionId: sec.id, label: sec.label };

  const updateBp = (updater: (prev: StoreBlueprint) => StoreBlueprint) => {
    setBp((prev) => updater(prev));
    setHasUnsavedChanges(true);
  };

  const moveSection = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= sectionLayout.length || fromIdx === toIdx) return;
    updateBp((prev) => {
      const next = getNormalizedSectionLayout(prev.sections.layout, prev.sections.customSections);
      const [moved] = next.splice(fromIdx, 1);
      if (!moved) return prev;
      next.splice(toIdx, 0, moved);
      return { ...prev, sections: { ...prev.sections, layout: next } };
    });
  };

  const toggleSection = (sectionId: string) => {
    updateBp((prev) => {
      const next = getNormalizedSectionLayout(prev.sections.layout, prev.sections.customSections).map((s) =>
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
        layout: getNormalizedSectionLayout(
          DEFAULT_SECTION_LAYOUT.map((s) => ({ ...s })),
          prev.sections.customSections
        ),
      },
    }));
  };

  const addCustomSection = (kind: CustomSectionKind) => {
    const created = createCustomSection(kind, bp);
    updateBp((prev) => {
      const existingCustom = prev.sections.customSections ?? [];
      const nextCustom = [...existingCustom, created];
      const baseLayout = getNormalizedSectionLayout(prev.sections.layout, existingCustom);
      const nextLayout: SectionConfig[] = [
        ...baseLayout,
        {
          id: created.id,
          label: created.title,
          irrobaModule: CUSTOM_SECTION_MODULE_LABELS[created.kind],
          enabled: true,
          isCustom: true,
          customKind: created.kind,
        },
      ];
      return {
        ...prev,
        sections: {
          ...prev.sections,
          customSections: nextCustom,
          layout: nextLayout,
        },
      };
    });
    setAddSectionOpen(false);
    selectAndFocusElement(
      { targetId: "custom-section", customSectionId: created.id, label: created.title },
      true
    );
  };

  const duplicateCustomSection = (customSectionId: string) => {
    const source = (bp.sections.customSections ?? []).find((c) => c.id === customSectionId);
    if (!source) return;
    const copyId = newCustomSectionId(source.kind);
    const copyTitle = `${source.title} (Cópia)`;
    const cloned: CustomSection = { ...source, id: copyId, title: copyTitle };

    updateBp((prev) => {
      const existingCustom = prev.sections.customSections ?? [];
      const srcIdx = existingCustom.findIndex((c) => c.id === customSectionId);
      const nextCustom = [...existingCustom];
      if (srcIdx >= 0) nextCustom.splice(srcIdx + 1, 0, cloned);
      else nextCustom.push(cloned);

      const baseLayout = getNormalizedSectionLayout(prev.sections.layout, existingCustom);
      const layoutIdx = baseLayout.findIndex((s) => s.id === customSectionId);
      const copyEntry: SectionConfig = {
        id: cloned.id,
        label: cloned.title,
        irrobaModule: CUSTOM_SECTION_MODULE_LABELS[cloned.kind],
        enabled: true,
        isCustom: true,
        customKind: cloned.kind,
      };
      const nextLayout = [...baseLayout];
      if (layoutIdx >= 0) nextLayout.splice(layoutIdx + 1, 0, copyEntry);
      else nextLayout.push(copyEntry);

      return {
        ...prev,
        sections: {
          ...prev.sections,
          customSections: nextCustom,
          layout: nextLayout,
        },
      };
    });
    selectAndFocusElement(
      { targetId: "custom-section", customSectionId: cloned.id, label: cloned.title },
      true
    );
  };

  const deleteCustomSection = (customSectionId: string) => {
    updateBp((prev) => {
      const nextCustom = (prev.sections.customSections ?? []).filter((c) => c.id !== customSectionId);
      const nextLayout = getNormalizedSectionLayout(prev.sections.layout, nextCustom).filter(
        (s) => s.id !== customSectionId
      );
      return {
        ...prev,
        sections: {
          ...prev.sections,
          customSections: nextCustom,
          layout: nextLayout,
        },
      };
    });
    if (selectedElement?.customSectionId === customSectionId) {
      selectAndFocusElement(null, false);
    }
  };

  const copyText = async (key: string, text: string) => {
    if (!(await copy(key, text))) {
      setActionError("Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.");
    }
  };

  const handleSave = async () => {
    const sent: StudioSaveSnapshot = { bp, sellerWhatsapp, currentMode };
    setIsSaving(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/previews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blueprint: sent.bp,
          sellerWhatsapp: sent.sellerWhatsapp,
          generationMode: sent.currentMode,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error || "Falha ao salvar alterações");
      }
      setBaselineTheme(sent.bp.theme);
      setBaselineBp(sent.bp);
      setHasUnsavedChanges(computeUnsaved(latestSnapshotRef.current, sent));
      setSavedNotice(true);
      savedNoticeTimeout.schedule(() => setSavedNotice(false), 2000);
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
              ? `Gemini indisponível: ${data.aiError}`
              : "Falha ao reanalisar com Gemini. O layout atual foi preservado.")
        );
        return;
      }
      if (data.mode && data.mode !== "gemini") {
        setActionError(
          data.aiError
            ? `Gemini indisponível: ${data.aiError} O layout atual foi preservado.`
            : "Gemini indisponível. O layout atual foi preservado."
        );
        return;
      }
      // Não aplica direto: o usuário escolhe entre substituir tudo ou só a paleta
      setPendingReanalysis({ blueprint: data.blueprint, mode: data.mode || "gemini" });
      if (data.aiError) {
        setActionError(`Gemini indisponível: ${data.aiError}`);
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

  return {
    id,
    slug,
    router,
    bp,
    baselineTheme,
    pendingReanalysis,
    setPendingReanalysis,
    currentMode,
    sellerWhatsapp,
    setSellerWhatsapp,
    activeTab,
    setActiveTab,
    mobilePane,
    setMobilePane,
    editorTab,
    setEditorTab,
    device,
    setDevice,
    inspectMode,
    setInspectMode,
    selectedElement,
    hoveredPreviewLabel,
    isSaving,
    isReanalyzing,
    actionError,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    savedNotice,
    copiedKey,
    newCategoryName,
    setNewCategoryName,
    addSectionOpen,
    setAddSectionOpen,
    dragSectionIdx,
    setDragSectionIdx,
    dragOverIdx,
    setDragOverIdx,
    dragSectionIdxRef,
    previewIframeRef,
    sidebarScrollRef,
    postToPreview,
    selectAndFocusElement,
    studioTabs,
    mobileTabs,
    editorTabs,
    workspacePanelId,
    editorAsideId,
    previewMainId,
    editorPanelId,
    hoverSidebarTarget,
    liveHtml,
    compareHtml,
    compiled,
    sectionLayout,
    toSectionSelection,
    updateBp,
    moveSection,
    toggleSection,
    resetSectionLayout,
    addCustomSection,
    duplicateCustomSection,
    deleteCustomSection,
    copyText,
    handleSave,
    handleReanalyzeWithGemini,
    applyInsightSuggestion,
    restoreOriginalPalette,
    acceptReanalysis,
    suggestionsCount,
    handleDownloadBenefitsPng,
  };
}

export type StudioState = ReturnType<typeof useStudioState>;
