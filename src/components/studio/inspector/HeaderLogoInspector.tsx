"use client";

import { AiImageSlot } from "../AiImageSlot";
import { Field } from "@/components/ui/Field";
import type { StoreBlueprint } from "@/lib/types/blueprint";
import type { InspectorTargetProps } from "./types";

/** Logotipo da loja. */
export function HeaderLogoInspector({ previewId, bp, onUpdateBp, onSelect }: InspectorTargetProps) {
  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3">
      <div>
        <Field label="Nome da Loja" labelClassName="mb-1 block font-semibold text-zinc-700">
        <input
          type="text"
          value={bp.brand.name}
          onChange={(e) =>
            onUpdateBp((prev) => ({
              ...prev,
              brand: { ...prev.brand, name: e.target.value },
            }))
          }
          className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-zinc-900"
        />
        </Field>
      </div>

      <AiImageSlot
        previewId={previewId}
        label="Imagem da Logo (PNG, SVG ou WebP)"
        value={bp.brand.logoUrl}
        defaultAspectRatio="1:1"
        minRecommendedWidth={0}
        fit="contain"
        allowClear
        onChange={(nextUrl) =>
          onUpdateBp((prev) => ({
            ...prev,
            brand: { ...prev.brand, logoUrl: nextUrl },
          }))
        }
      />

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2.5">
        <div className="mb-1 flex items-center justify-between text-zinc-700">
          <span className="font-semibold">Altura da Logo (PX)</span>
          <strong className="font-mono text-zinc-900">
            {bp.visualOverrides.header.logoHeightPx ?? 46}px
          </strong>
        </div>
        <input
          aria-label="Altura da logo (px)"
          type="range"
          min={24}
          max={120}
          step={2}
          value={bp.visualOverrides.header.logoHeightPx ?? 46}
          onChange={(e) =>
            onUpdateBp((prev) => ({
              ...prev,
              visualOverrides: {
                ...prev.visualOverrides,
                header: {
                  ...prev.visualOverrides.header,
                  logoHeightPx: Number(e.target.value),
                },
              },
            }))
          }
          className="w-full accent-brand-500"
        />
        <p className="mt-1 text-[11px] text-zinc-500">
          A logo é um elemento independente e mantém 100% de nitidez mesmo com a navbar transparente.
        </p>
      </div>

      <div>
        <Field label="Posição da Logo no Cabeçalho" labelClassName="mb-1 block font-semibold text-zinc-700">
        <select
          value={bp.theme.headerLayout}
          onChange={(e) =>
            onUpdateBp((prev) => ({
              ...prev,
              theme: {
                ...prev.theme,
                headerLayout: e.target.value as StoreBlueprint["theme"]["headerLayout"],
              },
            }))
          }
          className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-zinc-800"
        >
          <option value="layout-1">Layout 1 — Logo à esquerda + Menu na linha</option>
          <option value="layout-2">Layout 2 — Logo centralizada + Menu abaixo</option>
          <option value="layout-3">Layout 3 — Logo à esquerda + Menu em barra inferior</option>
        </select>
        </Field>
      </div>

      <button
        type="button"
        onClick={() => onSelect({ targetId: "header", label: "Cabeçalho" })}
        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
      >
        Editar cores, opacidade e posicionamento do Cabeçalho →
      </button>
    </div>
  );
}
