"use client";

import { useRef, useState } from "react";
import { Image as ImageIcon, Loader2, Trash2, Upload, Wand2 } from "lucide-react";

export type AiRatio = "16:9" | "21:9" | "3:4" | "1:1";

export function AiImageSlot({
  previewId,
  label,
  value,
  defaultAspectRatio = "16:9",
  minRecommendedWidth = 800,
  fit = "cover",
  allowAi = true,
  allowClear = false,
  onChange,
}: {
  previewId: string;
  label: string;
  value: string;
  defaultAspectRatio?: AiRatio;
  minRecommendedWidth?: number;
  fit?: "cover" | "contain";
  allowAi?: boolean;
  allowClear?: boolean;
  onChange: (nextUrl: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imgStatus, setImgStatus] = useState<"idle" | "ok" | "error">("idle");
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState<AiRatio>(defaultAspectRatio);
  const [busyMode, setBusyMode] = useState<"enhance" | "resize" | "generate" | "upload" | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; isError?: boolean } | null>(null);

  const isLowRes = Boolean(
    minRecommendedWidth > 0 && dims && dims.w > 0 && dims.w < minRecommendedWidth
  );
  const isMissing = !value || !value.trim() || imgStatus === "error";

  const uploadLocalFile = async (file: File) => {
    setBusyMode("upload");
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/previews/${previewId}/upload-image`, {
        method: "POST",
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as {
        imageUrl?: string;
        width?: number | null;
        height?: number | null;
        error?: string;
      };

      if (!res.ok || !data.imageUrl) {
        throw new Error(data.error || "Não foi possível enviar a imagem do computador.");
      }

      setImgStatus("idle");
      setDims(data.width && data.height ? { w: data.width, h: data.height } : null);
      onChange(data.imageUrl);
      setFeedback({
        text:
          data.width && data.height
            ? `Imagem enviada do computador (${data.width}×${data.height}px).`
            : "Imagem enviada do computador com sucesso.",
      });
    } catch (err) {
      setFeedback({
        text: err instanceof Error ? err.message : "Erro ao enviar imagem do computador.",
        isError: true,
      });
    } finally {
      setBusyMode(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const runAiImage = async (mode: "enhance" | "resize" | "generate") => {
    setBusyMode(mode);
    setFeedback(null);
    try {
      const res = await fetch(`/api/previews/${previewId}/ai-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt:
            prompt.trim() ||
            (mode === "enhance"
              ? `Melhorar nitidez, iluminação e resolução HD para ${label}`
              : mode === "resize"
                ? `Redimensionar e reenquadrar sem distorcer para ${ratio}`
                : `Criar arte editorial sofisticada para ${label}`),
          mode,
          aspectRatio: ratio,
          sourceImageUrl: mode === "generate" && isMissing ? undefined : value || undefined,
          slotLabel: label,
        }),
      });
      const data = (await res.json()) as {
        imageUrl?: string;
        width?: number;
        height?: number;
        modelUsed?: string;
        notice?: string;
        error?: string;
      };
      if (!res.ok || !data.imageUrl) {
        throw new Error(data.error || "Não foi possível gerar/ajustar a imagem.");
      }
      setImgStatus("idle");
      setDims(data.width && data.height ? { w: data.width, h: data.height } : null);
      onChange(data.imageUrl);
      setFeedback({
        text:
          data.notice ||
          `Imagem atualizada (${data.width ?? ""}×${data.height ?? ""}px · ${data.modelUsed ?? "IA"}).`,
      });
    } catch (err) {
      setFeedback({
        text: err instanceof Error ? err.message : "Erro ao ajustar imagem com IA.",
        isError: true,
      });
    } finally {
      setBusyMode(null);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        {isMissing ? (
          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-xs font-bold text-rose-700">
            Ausente / Sem imagem
          </span>
        ) : isLowRes && dims ? (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-800">
            Baixa res. ({dims.w}×{dims.h})
          </span>
        ) : dims ? (
          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">
            {dims.w}×{dims.h}px
          </span>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void uploadLocalFile(file);
        }}
        className="hidden"
      />

      {/* Live visual preview thumbnail + Drag & Drop / Click to Upload */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDraggingFile(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDraggingFile(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDraggingFile(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void uploadLocalFile(file);
        }}
        onClick={() => {
          if (busyMode === null) fileInputRef.current?.click();
        }}
        title="Clique ou arraste uma imagem do computador para enviar"
        className={`group relative h-24 w-full cursor-pointer overflow-hidden rounded-lg border transition ${
          isDraggingFile
            ? "border-2 border-dashed border-emerald-500 bg-emerald-50"
            : "border-slate-200 bg-slate-100 hover:border-emerald-400"
        }`}
      >
        {busyMode === "upload" ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Enviando imagem do computador...</span>
          </div>
        ) : value && imgStatus !== "error" ? (
          <>
            <img
              src={value}
              alt={label}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onLoad={(e) => {
                const img = e.currentTarget;
                setImgStatus("ok");
                setDims(
                  img.naturalWidth && img.naturalHeight
                    ? { w: img.naturalWidth, h: img.naturalHeight }
                    : null
                );
              }}
              onError={() => {
                setImgStatus("error");
                setDims(null);
              }}
              className={`h-full w-full ${fit === "contain" ? "object-contain p-2" : "object-cover"}`}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-900/55 opacity-0 transition group-hover:opacity-100">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-white/95 px-2.5 py-1 text-xs font-bold text-slate-900 shadow">
                <Upload className="h-3.5 w-3.5 text-emerald-600" />
                Trocar imagem do computador
              </span>
            </div>
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center text-xs text-slate-500">
            <ImageIcon className="h-4 w-4 text-slate-400" />
            <span className="font-medium text-slate-600">
              Clique ou arraste uma imagem do computador
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <input
          type="text"
          value={value}
          placeholder="https://... ou envie do computador"
          onChange={(e) => {
            setImgStatus("idle");
            onChange(e.target.value);
          }}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800"
        />
        <button
          type="button"
          disabled={busyMode !== null}
          onClick={() => fileInputRef.current?.click()}
          title="Selecionar arquivo de imagem do seu computador"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-slate-900 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {busyMode === "upload" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Upload className="h-3 w-3" />
          )}
          Enviar
        </button>
        {allowAi && (
          <button
            type="button"
            onClick={() => setAiOpen((prev) => !prev)}
            className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition ${
              isMissing || isLowRes
                ? "bg-emerald-600 text-white hover:bg-emerald-500"
                : "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            }`}
          >
            <Wand2 className="h-3 w-3" />
            IA
          </button>
        )}
        {allowClear && value && (
          <button
            type="button"
            onClick={() => {
              setImgStatus("idle");
              setDims(null);
              onChange("");
            }}
            title="Remover imagem"
            aria-label={`Remover ${label}`}
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {feedback && !aiOpen && (
        <div
          className={`rounded-md px-2 py-1 text-xs leading-snug ${
            feedback.isError
              ? "border border-rose-200 bg-rose-50 text-rose-700"
              : "border border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {allowAi && aiOpen && (
        <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-emerald-900">
              Ajuste / Recriação de Imagem por IA
            </span>
            <select
              value={ratio}
              onChange={(e) => setRatio(e.target.value as AiRatio)}
              className="rounded border border-emerald-200 bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-700"
            >
              <option value="16:9">16:9 (Banner HD)</option>
              <option value="21:9">21:9 (Slim)</option>
              <option value="3:4">3:4 (Editorial)</option>
              <option value="1:1">1:1 (Quadrado)</option>
            </select>
          </div>
          <textarea
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex: Aumentar resolução sem distorcer, fundo de estúdio minimalista, iluminação quente..."
            className="w-full rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-xs text-slate-800 placeholder:text-slate-400"
          />
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              disabled={busyMode !== null || isMissing}
              onClick={() => runAiImage("enhance")}
              className="inline-flex items-center justify-center gap-1 rounded bg-slate-900 px-1.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-40"
            >
              {busyMode === "enhance" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Melhorar HD
            </button>
            <button
              type="button"
              disabled={busyMode !== null || isMissing}
              onClick={() => runAiImage("resize")}
              className="inline-flex items-center justify-center gap-1 rounded bg-indigo-600 px-1.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-40"
            >
              {busyMode === "resize" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Redimensionar
            </button>
            <button
              type="button"
              disabled={busyMode !== null}
              onClick={() => runAiImage("generate")}
              className="inline-flex items-center justify-center gap-1 rounded bg-emerald-600 px-1.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-40"
            >
              {busyMode === "generate" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Recriar IA
            </button>
          </div>
          {feedback && (
            <div
              className={`rounded px-2 py-1 text-xs leading-snug ${
                feedback.isError
                  ? "bg-rose-50 text-rose-700"
                  : "bg-white/90 text-slate-700"
              }`}
            >
              {feedback.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
