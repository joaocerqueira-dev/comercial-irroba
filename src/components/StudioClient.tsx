"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Monitor,
  Palette,
  Save,
  Smartphone,
  Sparkles,
} from "lucide-react";
import type { CompiledExport, StoreBlueprint } from "@/lib/types/blueprint";

interface StudioClientProps {
  id: string;
  slug: string;
  sourceUrl: string;
  detectedPlatform: string;
  generationMode: string;
  initialWhatsapp: string;
  initialBlueprint: StoreBlueprint;
  initialExport: CompiledExport;
}

export default function StudioClient({
  id,
  slug,
  sourceUrl,
  detectedPlatform,
  generationMode,
  initialWhatsapp,
  initialBlueprint,
  initialExport,
}: StudioClientProps) {
  const [bp, setBp] = useState<StoreBlueprint>(initialBlueprint);
  const [compiled, setCompiled] = useState<CompiledExport>(initialExport);
  const [sellerWhatsapp, setSellerWhatsapp] = useState(initialWhatsapp);
  const [activeTab, setActiveTab] = useState<"preview" | "export">("preview");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [iframeKey, setIframeKey] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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
        const data = (await res.json()) as {
          preview: { compiledExport: CompiledExport };
        };
        if (data.preview?.compiledExport) {
          setCompiled(data.preview.compiledExport);
        }
        setIframeKey((k) => k + 1);
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 2000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const updateColor = (field: "primaryBackground" | "secondaryBackground" | "neutralBackground" | "bodyBackground", value: string) => {
    setBp((prev) => ({
      ...prev,
      theme: {
        ...prev.theme,
        [field]: value,
        ...(field === "primaryBackground" ? { btnPrimaryBackground: value } : {}),
      },
      visualOverrides: {
        ...prev.visualOverrides,
        ...(field === "primaryBackground"
          ? { productCard: { ...prev.visualOverrides.productCard, buyBtnBackground: value } }
          : {}),
        ...(field === "secondaryBackground"
          ? { footer: { ...prev.visualOverrides.footer, background: value } }
          : {}),
      },
    }));
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
                {generationMode === "gemini" ? "Gemini IA" : "Modo Automático"}
              </span>
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
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {savedNotice ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Save className="h-3.5 w-3.5" />}
            {isSaving ? "Salvando..." : savedNotice ? "Atualizado!" : "Aplicar Alterações"}
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
        {/* Left Sidebar: Quick Irroba LIME Controls */}
        <aside className="w-80 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Palette className="h-4 w-4 text-emerald-600" />
            Ajustes Rápidos · Tema LIME
          </div>

          <div className="space-y-5 text-xs">
            {/* Marca & Contato */}
            <div className="space-y-2.5 rounded-xl border border-slate-200 p-3">
              <div className="font-bold text-slate-800">Identidade & Consultor</div>
              <div>
                <label className="mb-1 block text-slate-500">Nome da Loja</label>
                <input
                  type="text"
                  value={bp.brand.name}
                  onChange={(e) =>
                    setBp((prev) => ({ ...prev, brand: { ...prev.brand, name: e.target.value } }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-slate-500">WhatsApp do Consultor (CTA)</label>
                <input
                  type="text"
                  value={sellerWhatsapp}
                  onChange={(e) => setSellerWhatsapp(e.target.value)}
                  placeholder="5511999999999"
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-900"
                />
              </div>
            </div>

            {/* Paleta LIME */}
            <div className="space-y-2.5 rounded-xl border border-slate-200 p-3">
              <div className="font-bold text-slate-800">Paleta Tema LIME</div>
              <div className="grid grid-cols-2 gap-2.5">
                <label className="block">
                  <span className="mb-1 block text-[11px] text-slate-500">Cor Primária</span>
                  <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 p-1">
                    <input
                      type="color"
                      value={bp.theme.primaryBackground}
                      onChange={(e) => updateColor("primaryBackground", e.target.value)}
                      className="h-6 w-8 cursor-pointer rounded border-0"
                    />
                    <span className="font-mono text-[11px]">{bp.theme.primaryBackground}</span>
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] text-slate-500">Cor Secundária</span>
                  <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 p-1">
                    <input
                      type="color"
                      value={bp.theme.secondaryBackground}
                      onChange={(e) => updateColor("secondaryBackground", e.target.value)}
                      className="h-6 w-8 cursor-pointer rounded border-0"
                    />
                    <span className="font-mono text-[11px]">{bp.theme.secondaryBackground}</span>
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] text-slate-500">Cor Neutra</span>
                  <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 p-1">
                    <input
                      type="color"
                      value={bp.theme.neutralBackground}
                      onChange={(e) => updateColor("neutralBackground", e.target.value)}
                      className="h-6 w-8 cursor-pointer rounded border-0"
                    />
                    <span className="font-mono text-[11px]">{bp.theme.neutralBackground}</span>
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] text-slate-500">Fundo Padrão</span>
                  <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 p-1">
                    <input
                      type="color"
                      value={bp.theme.bodyBackground}
                      onChange={(e) => updateColor("bodyBackground", e.target.value)}
                      className="h-6 w-8 cursor-pointer rounded border-0"
                    />
                    <span className="font-mono text-[11px]">{bp.theme.bodyBackground}</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Aba Tema (Editor Visual) */}
            <div className="space-y-2.5 rounded-xl border border-slate-200 p-3">
              <div className="font-bold text-slate-800">Controles Aba &ldquo;Tema&rdquo;</div>
              <div>
                <label className="mb-1 block text-slate-500">Arredondamento</label>
                <select
                  value={bp.theme.radius}
                  onChange={(e) =>
                    setBp((prev) => ({
                      ...prev,
                      theme: {
                        ...prev.theme,
                        radius: e.target.value as StoreBlueprint["theme"]["radius"],
                      },
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-900"
                >
                  <option value="none">Sem arredondamento</option>
                  <option value="small">Pequeno (6px)</option>
                  <option value="medium">Médio (12px)</option>
                  <option value="large">Grande (24px)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-slate-500">Cabeçalho: Layout</label>
                <select
                  value={bp.theme.headerLayout}
                  onChange={(e) =>
                    setBp((prev) => ({
                      ...prev,
                      theme: {
                        ...prev.theme,
                        headerLayout: e.target.value as StoreBlueprint["theme"]["headerLayout"],
                      },
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-900"
                >
                  <option value="layout-1">Layout 1 (Em linha)</option>
                  <option value="layout-2">Layout 2 (Centralizado)</option>
                  <option value="layout-3">Layout 3 (Compacto)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-slate-500">Cabeçalho: Posicionamento</label>
                <select
                  value={bp.visualOverrides.header.position}
                  onChange={(e) =>
                    setBp((prev) => ({
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
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-900"
                >
                  <option value="default">Padrão</option>
                  <option value="sticky">Fixo ao rolar</option>
                  <option value="overlay">Fixo na tela</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-slate-500">Texto Botão Comprar</label>
                <input
                  type="text"
                  value={bp.visualOverrides.pageProduct.buyButtonText}
                  onChange={(e) =>
                    setBp((prev) => ({
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
            </div>

            {/* Textos Hero & Tarja */}
            <div className="space-y-2.5 rounded-xl border border-slate-200 p-3">
              <div className="font-bold text-slate-800">Copywriting & Hero</div>
              <div>
                <label className="mb-1 block text-slate-500">Tarja Superior</label>
                <input
                  type="text"
                  value={bp.sections.announcementText}
                  onChange={(e) =>
                    setBp((prev) => ({
                      ...prev,
                      sections: { ...prev.sections, announcementText: e.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-slate-500">Headline do Banner</label>
                <input
                  type="text"
                  value={bp.sections.hero.headline}
                  onChange={(e) =>
                    setBp((prev) => ({
                      ...prev,
                      sections: {
                        ...prev.sections,
                        hero: { ...prev.sections.hero, headline: e.target.value },
                      },
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-slate-500">Subtítulo do Banner</label>
                <textarea
                  rows={2}
                  value={bp.sections.hero.subheadline}
                  onChange={(e) =>
                    setBp((prev) => ({
                      ...prev,
                      sections: {
                        ...prev.sections,
                        hero: { ...prev.sections.hero, subheadline: e.target.value },
                      },
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-900"
                />
              </div>
            </div>
          </div>
        </aside>

        {/* Center/Right Pane */}
        {activeTab === "preview" ? (
          <main className="flex flex-1 flex-col overflow-hidden p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Visualização isolada fiel ao Tema LIME (clique em produtos para testar PDP e Carrinho)
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
                key={iframeKey}
                src={`/render/${slug}`}
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
                    Copie os tokens e blocos abaixo para replicar este layout aprovado direto no painel do cliente na Irroba.
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

              {/* Passo 3: Blocos Conteúdo HTML (SunEditor) */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900">
                  3. Blocos Low-Code (Configurações &gt; Módulos &gt; Conteúdo HTML · SunEditor)
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

              {/* Passo 4: CSS Personalizado */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      4. Editar tema &gt; Código &gt; CSS Personalizado
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Refinamentos globais de hover e arredondamento para o Tema LIME.
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
