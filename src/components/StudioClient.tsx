"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  LayoutGrid,
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
import type { DesignInsight, StoreBlueprint } from "@/lib/types/blueprint";

interface StudioClientProps {
  id: string;
  slug: string;
  sourceUrl: string;
  detectedPlatform: string;
  generationMode: string;
  initialWhatsapp: string;
  initialBlueprint: StoreBlueprint;
}

type EditorSubTab = "insights" | "colors" | "banners" | "structure";

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const safeHex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#111827";
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-slate-600">{label}</span>
      <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1">
        <input
          type="color"
          value={safeHex}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-6 w-7 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 font-mono text-[11px] text-slate-800 focus:outline-none"
        />
      </div>
    </label>
  );
}

const FONT_OPTIONS = [
  "Montserrat",
  "Poppins",
  "Cormorant Garamond",
  "Playfair Display",
  "Jost",
  "Lora",
  "Lato",
  "Roboto",
  "Oswald",
  "Cabin",
  "Anton",
  "Manrope",
];

export default function StudioClient({
  id,
  slug,
  sourceUrl,
  detectedPlatform,
  generationMode,
  initialWhatsapp,
  initialBlueprint,
}: StudioClientProps) {
  const [bp, setBp] = useState<StoreBlueprint>(initialBlueprint);
  const [baselineTheme, setBaselineTheme] = useState(initialBlueprint.theme);
  const [sellerWhatsapp, setSellerWhatsapp] = useState(initialWhatsapp);
  const [activeTab, setActiveTab] = useState<"preview" | "export">("preview");
  const [editorTab, setEditorTab] = useState<EditorSubTab>("insights");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");

  const liveHtml = useMemo(() => compileStorefrontDocument(bp), [bp]);
  const compiled = useMemo(() => compileIrrobaExport(bp), [bp]);

  const updateBp = (updater: (prev: StoreBlueprint) => StoreBlueprint) => {
    setBp((prev) => updater(prev));
    setHasUnsavedChanges(true);
  };

  const copyText = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/previews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blueprint: bp, sellerWhatsapp }),
      });
      if (res.ok) {
        setBaselineTheme(bp.theme);
        setHasUnsavedChanges(false);
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 2000);
      }
    } finally {
      setIsSaving(false);
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

  const restoreOriginalPalette = () => {
    updateBp((prev) => ({
      ...prev,
      theme: { ...initialBlueprint.theme },
      visualOverrides: {
        ...prev.visualOverrides,
        announcement: { ...initialBlueprint.visualOverrides.announcement },
        header: { ...initialBlueprint.visualOverrides.header },
        productCard: { ...initialBlueprint.visualOverrides.productCard },
        footer: { ...initialBlueprint.visualOverrides.footer },
      },
    }));
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
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900">{bp.brand.name}</h1>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                Origem: {detectedPlatform}
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                <Sparkles className="h-3 w-3" />
                {generationMode === "gemini" ? "Gemini IA" : "Análise Profunda"}
              </span>
              {hasUnsavedChanges && (
                <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                  Alterações não salvas
                </span>
              )}
            </div>
            <p className="max-w-md truncate text-xs text-slate-500">{sourceUrl}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
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
              onClick={() => setActiveTab("export")}
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

          <button
            type="button"
            onClick={() => copyText("client-link", `${window.location.origin}/preview/${slug}`)}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            {copiedKey === "client-link" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedKey === "client-link" ? "Link Copiado!" : "Copiar Link do Cliente"}
          </button>

          <Link
            href={`/preview/${slug}`}
            target="_blank"
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
          >
            Abrir Link Beta
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Full Freedom Editor */}
        <aside className="flex w-96 shrink-0 flex-col border-r border-slate-200 bg-white">
          {/* Sub-tab navigation */}
          <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setEditorTab("insights")}
              className={`relative flex flex-col items-center gap-1 py-2.5 ${
                editorTab === "insights"
                  ? "border-b-2 border-emerald-600 bg-white text-emerald-700"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Análise</span>
              {suggestionsCount > 0 && (
                <span className="absolute right-2 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
                  {suggestionsCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setEditorTab("colors")}
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
              className={`flex flex-col items-center gap-1 py-2.5 ${
                editorTab === "structure"
                  ? "border-b-2 border-emerald-600 bg-white text-emerald-700"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Estrutura</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 text-xs">
            {/* TAB 1: DIAGNÓSTICO, PALETA FIEL & MARCA */}
            {editorTab === "insights" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      Diagnóstico de Paleta &amp; Conversão
                    </span>
                    <button
                      type="button"
                      onClick={restoreOriginalPalette}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900"
                      title="Restaurar paleta original extraída"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Original
                    </button>
                  </div>

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
                                  className="mt-1 inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-800"
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
                      className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-800"
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
                        <label className="mb-1 block text-[11px] text-slate-500">Modo do Banner</label>
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

                      <div>
                        <label className="mb-1 block text-[11px] text-slate-500">URL da Imagem</label>
                        <input
                          type="text"
                          value={slide.imageUrl}
                          onChange={(e) =>
                            updateBp((prev) => ({
                              ...prev,
                              sections: {
                                ...prev.sections,
                                heroSlides: prev.sections.heroSlides.map((s, i) =>
                                  i === idx ? { ...s, imageUrl: e.target.value } : s
                                ),
                              },
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-800"
                        />
                      </div>

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

                {/* Banner de Benefícios (Arte Extraída ou Gerada) */}
                <div className="space-y-2.5 rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Banner de Benefícios (Régua)</span>
                    <button
                      type="button"
                      onClick={handleDownloadBenefitsPng}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-500"
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
                            mode: e.target.value as "site-images" | "generated-art" | "cards",
                          },
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-slate-800"
                  >
                    {(bp.sections.benefitsBanner?.siteImageUrls?.length ?? 0) > 0 && (
                      <option value="site-images">Artes Extraídas do Site</option>
                    )}
                    <option value="generated-art">Arte Banner Gerada (Irroba)</option>
                    <option value="cards">Cards Modulares HTML</option>
                  </select>

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
                              textColor: v,
                            },
                          },
                        }))
                      }
                    />
                  </div>

                  {bp.sections.benefitsBanner?.mode !== "site-images" && (
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
                            className="rounded border border-slate-200 px-2 py-1 text-[11px]"
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
                            className="rounded border border-slate-200 px-2 py-1 text-[11px]"
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
                      <input
                        type="text"
                        placeholder="URL da imagem slim"
                        value={bp.sections.slimBanner.imageUrl}
                        onChange={(e) =>
                          updateBp((prev) => ({
                            ...prev,
                            sections: {
                              ...prev.sections,
                              slimBanner: prev.sections.slimBanner
                                ? { ...prev.sections.slimBanner, imageUrl: e.target.value }
                                : undefined,
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
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
                    <input
                      type="text"
                      value={bp.sections.secondaryBanner.imageUrl}
                      placeholder="URL da imagem"
                      onChange={(e) =>
                        updateBp((prev) => ({
                          ...prev,
                          sections: {
                            ...prev.sections,
                            secondaryBanner: prev.sections.secondaryBanner
                              ? { ...prev.sections.secondaryBanner, imageUrl: e.target.value }
                              : undefined,
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
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
                  <div className="font-bold text-slate-800">Mosaico Visual (Mood / Coleções)</div>
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
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: TIPOGRAFIA, LAYOUT, CATEGORIAS & PRODUTOS */}
            {editorTab === "structure" && (
              <div className="space-y-4">
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
                        <span className="flex-1 truncate text-[11px] text-slate-700">
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
          <main className="flex flex-1 flex-col overflow-hidden p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Prévia instantânea fiel ao Tema LIME (alterações refletem na hora — clique em Salvar para atualizar o Link Beta)
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
        ) : (
          <main className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-4xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <div>
                  <h2 className="text-base font-bold text-emerald-950">
                    Pacote de Implantação Pós-Venda · Irroba LIME
                  </h2>
                  <p className="mt-1 text-xs text-emerald-800">
                    Copie os tokens, banners e blocos abaixo para replicar este layout aprovado direto no painel da Irroba.
                  </p>
                </div>
                <a
                  href={`/api/previews/${id}/csv`}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  <Download className="h-4 w-4" />
                  Baixar Catálogo (.CSV)
                </a>
              </div>

              {/* Passo 1: Configurações LIME */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-bold text-slate-900">
                  1. Editar tema &gt; Configurações (Tema LIME)
                </h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {compiled.limeSettings.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                    >
                      <div>
                        <span className="block text-[10px] font-semibold uppercase text-slate-400">
                          {item.section}
                        </span>
                        <span className="font-medium text-slate-700">{item.field}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText(`lime-${idx}`, item.value)}
                        className="flex items-center gap-1 rounded bg-white px-2 py-1 font-mono text-[11px] font-semibold text-slate-900 shadow-sm hover:bg-slate-100"
                      >
                        {item.value}
                        {copiedKey === `lime-${idx}` ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3 text-slate-400" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Passo 2: Checklist Aba Tema */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-bold text-slate-900">
                  2. Editar tema &gt; Tema (Editor Visual por Seção)
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {compiled.themeVisualChecklist.map((grp, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 p-3.5 text-xs">
                      <div className="mb-2 font-bold text-slate-800">{grp.section}</div>
                      <ul className="space-y-1.5">
                        {grp.controls.map((c, cIdx) => (
                          <li key={cIdx} className="flex justify-between gap-2 text-slate-600">
                            <span>{c.label}:</span>
                            <strong className="text-slate-900">{c.value}</strong>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>

              {/* Passo 3: Banners Nativos */}
              {compiled.bannerModulesChecklist.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      3. Personalizar Loja &gt; Banners (Banner Versão 2)
                    </h3>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    {compiled.bannerModulesChecklist.map((b, idx) => (
                      <div
                        key={idx}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900">{b.slotName}</div>
                          <div className="text-slate-600">{b.notes}</div>
                          <div className="mt-1 truncate font-mono text-[11px] text-slate-500">
                            {b.imageUrl}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyText(`banner-${idx}`, b.imageUrl)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          {copiedKey === `banner-${idx}` ? "URL Copiada ✓" : "Copiar URL"}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Passo 4: Blocos Conteúdo HTML (SunEditor) */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900">
                  4. Blocos Low-Code (Configurações &gt; Módulos &gt; Conteúdo HTML · SunEditor)
                </h3>
                {compiled.htmlBlocks.map((blk) => (
                  <div key={blk.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{blk.moduleTitle}</h4>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            Largura: {blk.recommendedWidth}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{blk.placementNote}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText(blk.id, blk.html)}
                        className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        {copiedKey === blk.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        {copiedKey === blk.id ? "HTML Copiado!" : "Copiar HTML (SunEditor)"}
                      </button>
                    </div>
                    <pre className="mt-3 max-h-48 overflow-auto rounded-xl bg-slate-950 p-3.5 text-[11px] leading-relaxed text-emerald-300">
                      <code>{blk.html}</code>
                    </pre>
                  </div>
                ))}
              </section>

              {/* Passo 5: CSS Personalizado */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      5. Editar tema &gt; Código &gt; CSS Personalizado
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Refinamentos globais de hover, bordas e arredondamento para o Tema LIME.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText("custom-css", compiled.customCss)}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    {copiedKey === "custom-css" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copiedKey === "custom-css" ? "CSS Copiado!" : "Copiar CSS"}
                  </button>
                </div>
                <pre className="mt-3 overflow-auto rounded-xl bg-slate-950 p-3.5 text-[11px] leading-relaxed text-sky-300">
                  <code>{compiled.customCss}</code>
                </pre>
              </section>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
