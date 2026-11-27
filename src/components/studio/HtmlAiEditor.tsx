"use client";

import { Field } from "@/components/ui/Field";
import { useMemo, useRef, useState } from "react";
import {
  Code2,
  Expand,
  ImagePlus,
  Loader2,
  Monitor,
  RotateCcw,
  Smartphone,
  Sparkles,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import {
  escapeHtml,
  sanitizeCssColor,
  sanitizeCustomHtmlBlock,
  sanitizeFontName,
  validateSunEditorHtml,
} from "@/lib/irroba-blocks/sanitize";
import Link from "next/link";
import { useAiStatus } from "./AiStatusContext";
import { aiDisabledReason } from "@/lib/ai/status";
import type { StoreBlueprint } from "@/lib/types/blueprint";

interface HtmlAiEditorProps {
  previewId: string;
  html: string;
  onChange: (nextHtml: string) => void;
  sectionTitle?: string;
  onSuggestedTitle?: (title: string) => void;
  widthMode?: "container" | "full";
  bp: StoreBlueprint;
  defaultResetHtml?: string;
  label?: string;
}

const QUICK_PROMPT_CHIPS: Array<{ label: string; prompt: string; preferredMode?: "generate" | "refine" }> = [
  {
    label: "Grade 3 cards",
    prompt:
      "Crie uma grade responsiva com 3 cards elegantes usando as cores e fontes da marca, com destaque visual, título curto e descrição persuasiva em cada card.",
    preferredMode: "generate",
  },
  {
    label: "Bloco institucional",
    prompt:
      "Crie um bloco institucional contando a essência e os diferenciais da marca com título editorial, parágrafo objetivo e botão de ação com alto contraste.",
    preferredMode: "generate",
  },
  {
    label: "Tabela comparativa",
    prompt:
      "Crie uma tabela comparativa limpa e responsiva destacando os benefícios e diferenciais da loja em comparação ao padrão do mercado.",
    preferredMode: "generate",
  },
  {
    label: "FAQ acordeão",
    prompt:
      "Crie uma seção de Perguntas Frequentes (FAQ) usando tags HTML nativas <details> e <summary> estilizadas inline com as cores da loja.",
    preferredMode: "generate",
  },
  {
    label: "Melhorar responsividade",
    prompt:
      "Refine o HTML atual preservando textos e imagens, garantindo excelente visualização no celular com flex-wrap, max-width: 100% e espaçamentos confortáveis.",
    preferredMode: "refine",
  },
  {
    label: "Ajustar contraste",
    prompt:
      "Ajuste o contraste de cores, fundos e botões do HTML atual mantendo a identidade visual da loja para facilitar a leitura e aumentar conversão.",
    preferredMode: "refine",
  },
];

function buildSafeIframeSrcDoc(rawHtml: string, bp: StoreBlueprint, widthMode: "container" | "full"): string {
  const cleanHtml = sanitizeCustomHtmlBlock(rawHtml);
  const bg = sanitizeCssColor(bp.theme.bodyBackground, "#FFFFFF");
  const fg = sanitizeCssColor(bp.theme.bodyForeground, "#111827");
  const bodyFont = escapeHtml(sanitizeFontName(bp.theme.bodyFont, "sans-serif"));
  const innerStyle =
    widthMode === "container"
      ? "max-width:1280px;margin:0 auto;padding:12px 16px;"
      : "width:100%;margin:0;padding:0;";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: ${bg}; color: ${fg}; font-family: '${bodyFont}', system-ui, -apple-system, sans-serif; }
  img { max-width: 100%; height: auto; }
</style>
</head>
<body>
  <div style="${innerStyle}">${cleanHtml || '<p style="opacity:.6;font-size:13px;padding:16px;">Bloco HTML vazio.</p>'}</div>
</body>
</html>`;
}

export function HtmlAiEditor({
  previewId,
  html,
  onChange,
  sectionTitle,
  onSuggestedTitle,
  widthMode = "container",
  bp,
  defaultResetHtml,
  label = "Editor HTML com IA (SunEditor)",
}: HtmlAiEditorProps) {
  const textReason = aiDisabledReason(useAiStatus(), "text");
  const [prompt, setPrompt] = useState("");
  const [refineExisting, setRefineExisting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile">("desktop");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const warnings = useMemo(() => validateSunEditorHtml(html), [html]);

  const storeImagePool = useMemo(() => {
    const seen = new Set<string>();
    const items: Array<{ url: string; label: string }> = [];
    const push = (url: string | undefined, lbl: string) => {
      if (!url || seen.has(url)) return;
      if (url.startsWith("/api/captures/") || /^https?:\/\//i.test(url)) {
        seen.add(url);
        items.push({ url, label: lbl });
      }
    };
    push(bp.sections.hero.imageUrl, "Hero Principal");
    bp.sections.heroSlides.forEach((s, i) => push(s.imageUrl, s.headline || `Slide ${i + 1}`));
    push(bp.sections.secondaryBanner?.imageUrl, bp.sections.secondaryBanner?.headline || "Banner Secundário");
    bp.sections.moodBanners.forEach((m, i) => push(m.imageUrl, m.title || `Galeria ${i + 1}`));
    bp.products.slice(0, 8).forEach((p) => push(p.imageUrl, p.title));
    return items.slice(0, 14);
  }, [
    bp.sections.hero.imageUrl,
    bp.sections.heroSlides,
    bp.sections.secondaryBanner,
    bp.sections.moodBanners,
    bp.products,
  ]);

  const pushUndo = (prevHtml: string) => {
    setUndoStack((prev) => [...prev.slice(-9), prevHtml]);
  };

  const handleUndo = () => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      const last = copy.pop()!;
      onChange(last);
      setAiSummary("Alteração anterior restaurada.");
      setErrorMsg(null);
      return copy;
    });
  };

  const runAiGeneration = async (overridePrompt?: string, overrideMode?: "generate" | "refine") => {
    const cleanPrompt = (overridePrompt ?? prompt).trim();
    if (cleanPrompt.length < 3) {
      setErrorMsg("Descreva o que você deseja gerar ou ajustar (mínimo 3 caracteres).");
      return;
    }

    const mode: "generate" | "refine" =
      overrideMode ?? (html.trim() && refineExisting ? "refine" : "generate");

    setLoading(true);
    setErrorMsg(null);
    setAiSummary(null);

    try {
      const res = await fetch(`/api/previews/${previewId}/ai-html`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: cleanPrompt,
          currentHtml: mode === "refine" && html.trim() ? html : undefined,
          sectionTitle,
          widthMode,
          mode,
          themeOverride: {
            primary: bp.theme.primaryBackground,
            secondary: bp.theme.secondaryBackground,
            background: bp.theme.bodyBackground,
            foreground: bp.theme.bodyForeground,
            headingFont: bp.theme.headingFont,
            bodyFont: bp.theme.bodyFont,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Falha ao gerar HTML com IA.");
      }

      pushUndo(html);
      onChange(String(data.html || ""));
      if (data.summary) setAiSummary(String(data.summary));
      if (data.suggestedTitle && onSuggestedTitle) {
        onSuggestedTitle(String(data.suggestedTitle));
      }
      if (!overridePrompt) setPrompt("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao gerar conteúdo HTML.");
    } finally {
      setLoading(false);
    }
  };

  const insertImageSnippet = (imageUrl: string, altText = sectionTitle || bp.brand.name) => {
    const cleanSnippet = `\n<div style="margin:16px 0;text-align:center;"><img src="${imageUrl.replace(/"/g, "&quot;")}" alt="${escapeHtml(altText)}" style="display:block;width:100%;max-width:100%;height:auto;border-radius:8px;" /></div>\n`;
    pushUndo(html);
    onChange(`${html.trimEnd()}${cleanSnippet}`);
    setShowImagePicker(false);
    setAiSummary("Imagem inserida no HTML.");
  };

  const handleUploadImage = async (file: File) => {
    setUploadingImg(true);
    setErrorMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/previews/${previewId}/upload-image`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data?.imageUrl) {
        throw new Error(data?.error || "Erro ao enviar imagem.");
      }
      insertImageSnippet(String(data.imageUrl), file.name.replace(/\.[^.]+$/, ""));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro no upload da imagem.");
    } finally {
      setUploadingImg(false);
    }
  };

  // Só monta o srcdoc (cheerio) com o modal aberto: fechado, nenhuma edição do Studio paga esse custo
  const iframeSrcDoc = useMemo(
    () => (modalOpen ? buildSafeIframeSrcDoc(html, bp, widthMode) : ""),
    [modalOpen, html, bp, widthMode]
  );

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
          <Code2 className="h-3.5 w-3.5 text-emerald-600" />
          {label}
        </span>
        <div className="flex items-center gap-1">
          {undoStack.length > 0 && (
            <button
              type="button"
              onClick={handleUndo}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
              title="Desfazer última edição"
            >
              <Undo2 className="h-3 w-3" />
              Desfazer
            </button>
          )}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
            title="Abrir editor ampliado com preview ao vivo"
          >
            <Expand className="h-3 w-3" />
            Ampliar
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-2.5 space-y-2">
        <Field
          label="Descreva o bloco ou ajuste desejado"
          labelClassName="block text-[11px] font-semibold text-emerald-900"
        >
          <textarea
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex: Crie 3 cards de diferenciais com ícones minimalistas e botão Ver Coleção..."
            className="w-full rounded-lg border border-emerald-200 bg-white px-2.5 py-2 text-xs text-zinc-800 outline-none focus:border-emerald-500"
          />
        </Field>

        <div className="flex flex-wrap gap-1">
          {QUICK_PROMPT_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              disabled={loading}
              onClick={() => {
                setPrompt(chip.prompt);
                void runAiGeneration(
                  chip.prompt,
                  chip.preferredMode === "refine" && html.trim() ? "refine" : chip.preferredMode
                );
              }}
              className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-medium text-emerald-800 hover:bg-emerald-100/70 disabled:opacity-50"
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          {html.trim() ? (
            <label className="inline-flex items-center gap-1.5 text-[11px] text-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                checked={refineExisting}
                onChange={(e) => setRefineExisting(e.target.checked)}
                className="rounded border-zinc-300 text-emerald-600"
              />
              Refinar HTML atual
            </label>
          ) : (
            <span className="text-[11px] text-zinc-500">Gera CSS inline (SunEditor)</span>
          )}

          <button
            type="button"
            disabled={loading || Boolean(textReason)}
            title={textReason ?? undefined}
            onClick={() => void runAiGeneration()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {loading ? "Gerando..." : html.trim() && refineExisting ? "Refinar com IA" : "Gerar com IA"}
          </button>
          {textReason && (
            <span className="text-[11px] text-zinc-600">
              {textReason}{" "}
              <Link href="/conta/ia" className="font-semibold underline">
                Minha IA
              </Link>
            </span>
          )}
        </div>

        {aiSummary && (
          <p className="rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 text-[11px] text-emerald-800">
            {aiSummary}
          </p>
        )}
        {errorMsg && (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] text-rose-700">
            {errorMsg}
          </p>
        )}
      </div>

      {/* Inserção rápida de imagens da loja ou upload */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowImagePicker((v) => !v)}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <ImagePlus className="h-3.5 w-3.5 text-zinc-500" />
              Inserir Imagem da Loja
            </button>
            <button
              type="button"
              disabled={uploadingImg}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              {uploadingImg ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5 text-zinc-500" />
              )}
              Upload
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void handleUploadImage(file);
              }}
            />
          </div>

          {defaultResetHtml !== undefined && (
            <button
              type="button"
              onClick={() => {
                pushUndo(html);
                onChange(defaultResetHtml);
                setAiSummary("HTML padrão restaurado.");
              }}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50"
            >
              <RotateCcw className="h-3 w-3" />
              Restaurar HTML padrão
            </button>
          )}
        </div>

        {showImagePicker && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2">
            {storeImagePool.length === 0 ? (
              <p className="text-[11px] text-zinc-500">Nenhuma imagem da loja encontrada no blueprint.</p>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto">
                {storeImagePool.map((img) => (
                  <button
                    key={img.url}
                    type="button"
                    onClick={() => insertImageSnippet(img.url, img.label)}
                    className="group relative aspect-square overflow-hidden rounded border border-zinc-200 bg-white hover:border-emerald-500"
                    title={`Inserir: ${img.label}`}
                  >
                    <img src={img.url} alt={img.label} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 space-y-1">
          {warnings.map((w, idx) => (
            <p key={idx} className="text-[11px] text-amber-800">
              • {w}
            </p>
          ))}
        </div>
      )}

      <div>
        <Field label="Código HTML" labelClassName="mb-1 block text-[11px] font-semibold text-zinc-600">
          <textarea
            rows={6}
            value={html}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            placeholder='<div style="padding:32px 16px;text-align:center;">...</div>'
            className="w-full rounded-lg border border-zinc-200 bg-zinc-950 px-2.5 py-2 font-mono text-[11px] leading-relaxed text-emerald-200 outline-none focus:border-emerald-500"
          />
        </Field>
      </div>

      {/* Modal ampliado com código + preview seguro em iframe sandbox="" */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/65 p-4 backdrop-blur-xs">
          <div className="flex h-[86vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  Editor HTML Avançado {sectionTitle ? `· ${sectionTitle}` : ""}
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Preview isolado em sandbox seguro (SunEditor · estilos inline).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-0.5">
                  <button
                    type="button"
                    onClick={() => setPreviewViewport("desktop")}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${
                      previewViewport === "desktop" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-600"
                    }`}
                  >
                    <Monitor className="h-3.5 w-3.5" /> Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewViewport("mobile")}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${
                      previewViewport === "mobile" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-600"
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5" /> Mobile
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  <X className="h-3.5 w-3.5" /> Fechar
                </button>
              </div>
            </div>

            <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-2">
              <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-200 p-3 min-h-0">
                <span className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  HTML Inline
                </span>
                <textarea
                  value={html}
                  onChange={(e) => onChange(e.target.value)}
                  spellCheck={false}
                  className="flex-1 w-full resize-none rounded-lg border border-zinc-200 bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-emerald-200 outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex flex-col bg-zinc-100 p-3 min-h-0">
                <span className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Pré-visualização Isolada ({previewViewport === "desktop" ? "100%" : "390px"})
                </span>
                <div className="flex flex-1 min-h-0 justify-center overflow-auto rounded-lg border border-zinc-200 bg-white">
                  <iframe
                    srcDoc={iframeSrcDoc}
                    sandbox=""
                    title="Pré-visualização do bloco HTML"
                    style={{ width: previewViewport === "mobile" ? "390px" : "100%" }}
                    className="h-full border-0 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
