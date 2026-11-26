"use client";

import { RotateCcw } from "lucide-react";
import { Field } from "@/components/ui/Field";

interface BannerDimensionsControlProps {
  title?: string;
  heightPx?: number;
  defaultHeightPx: number;
  minHeightPx?: number;
  maxHeightPx?: number;
  widthPx?: number;
  defaultWidthPx?: number;
  minWidthPx?: number;
  maxWidthPx?: number;
  isFullWidth?: boolean;
  onFullWidthChange?: (full: boolean) => void;
  objectFit?: "cover" | "contain" | "fill";
  onHeightChange: (next: number | undefined) => void;
  onWidthChange?: (next: number | undefined) => void;
  onObjectFitChange?: (next: "cover" | "contain" | "fill") => void;
}

export function BannerDimensionsControl({
  title = "Tamanho de Exibição (PX)",
  heightPx,
  defaultHeightPx,
  minHeightPx = 120,
  maxHeightPx = 1000,
  widthPx,
  defaultWidthPx = 1280,
  minWidthPx = 280,
  maxWidthPx = 1920,
  isFullWidth,
  onFullWidthChange,
  objectFit,
  onHeightChange,
  onWidthChange,
  onObjectFitChange,
}: BannerDimensionsControlProps) {
  const effectiveHeight = heightPx ?? defaultHeightPx;
  const effectiveWidth = widthPx ?? defaultWidthPx;
  const fullWidthActive = isFullWidth ?? widthPx === undefined;

  return (
    <div className="space-y-2.5 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-zinc-800">{title}</span>
        {(heightPx !== undefined || widthPx !== undefined) && (
          <button
            type="button"
            onClick={() => {
              onHeightChange(undefined);
              onWidthChange?.(undefined);
              onFullWidthChange?.(true);
            }}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-zinc-900"
            title="Restaurar tamanho responsivo automático"
          >
            <RotateCcw className="h-3 w-3" />
            Auto
          </button>
        )}
      </div>

      {/* Altura em PX */}
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-zinc-600">Altura (px)</span>
          <div className="flex items-center gap-1">
            <input
              aria-label="Altura (px)"
              type="number"
              min={minHeightPx}
              max={maxHeightPx}
              step={10}
              value={heightPx ?? ""}
              placeholder={`Auto (${defaultHeightPx})`}
              onChange={(e) => {
                const raw = e.target.value.trim();
                if (!raw) {
                  onHeightChange(undefined);
                  return;
                }
                const num = Number(raw);
                if (!Number.isNaN(num)) {
                  onHeightChange(Math.min(maxHeightPx, Math.max(minHeightPx, Math.round(num))));
                }
              }}
              className="w-24 rounded border border-zinc-200 bg-white px-2 py-0.5 text-right font-mono text-xs text-zinc-900"
            />
            <span className="text-[11px] font-medium text-zinc-500">px</span>
          </div>
        </div>
        <input
          aria-label="Altura (px), controle deslizante"
          type="range"
          min={minHeightPx}
          max={maxHeightPx}
          step={10}
          value={effectiveHeight}
          onChange={(e) => onHeightChange(Number(e.target.value))}
          className="w-full accent-brand-500"
        />
      </div>

      {/* Largura em PX */}
      {onWidthChange && (
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <label className="flex items-center gap-1.5 text-zinc-600">
              <input
                type="checkbox"
                checked={fullWidthActive}
                onChange={(e) => {
                  const full = e.target.checked;
                  onFullWidthChange?.(full);
                  if (full) {
                    onWidthChange(undefined);
                  } else {
                    onWidthChange(effectiveWidth);
                  }
                }}
              />
              <span>Largura total (100%)</span>
            </label>
            {!fullWidthActive && (
              <div className="flex items-center gap-1">
                <input
                  aria-label="Largura (px)"
                  type="number"
                  min={minWidthPx}
                  max={maxWidthPx}
                  step={20}
                  value={effectiveWidth}
                  onChange={(e) => {
                    const num = Number(e.target.value);
                    if (!Number.isNaN(num)) {
                      onWidthChange(Math.min(maxWidthPx, Math.max(minWidthPx, Math.round(num))));
                    }
                  }}
                  className="w-20 rounded border border-zinc-200 bg-white px-2 py-0.5 text-right font-mono text-xs text-zinc-900"
                />
                <span className="text-[11px] font-medium text-zinc-500">px</span>
              </div>
            )}
          </div>
          {!fullWidthActive && (
            <input
              aria-label="Largura (px), controle deslizante"
              type="range"
              min={minWidthPx}
              max={maxWidthPx}
              step={20}
              value={effectiveWidth}
              onChange={(e) => onWidthChange(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
          )}
        </div>
      )}

      {/* Enquadramento */}
      {onObjectFitChange && (
        <div>
          <Field label="Enquadramento da Imagem" labelClassName="mb-1 block text-zinc-600">
          <select
            value={objectFit ?? "cover"}
            onChange={(e) =>
              onObjectFitChange(e.target.value as "cover" | "contain" | "fill")
            }
            className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-800"
          >
            <option value="cover">Preencher área (Cover)</option>
            <option value="contain">Mostrar inteira sem corte (Contain)</option>
            <option value="fill">Ajustar exato aos pixels (Fill)</option>
          </select>
          </Field>
        </div>
      )}
    </div>
  );
}
