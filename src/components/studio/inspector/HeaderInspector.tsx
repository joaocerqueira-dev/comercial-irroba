"use client";

import { ColorField } from "../ColorField";
import { HeaderLinksHoverControls } from "../HeaderLinksHoverControls";
import { Field } from "@/components/ui/Field";
import type { StoreBlueprint } from "@/lib/types/blueprint";
import type { InspectorTargetProps } from "./types";

/** Cabeçalho completo. */
export function HeaderInspector({ bp, onUpdateBp, onSelect }: InspectorTargetProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Field label="Estrutura" labelClassName="mb-1 block text-zinc-500">
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
              <option value="layout-1">Layout 1 (Linha)</option>
              <option value="layout-2">Layout 2 (Central)</option>
              <option value="layout-3">Layout 3 (Duplo)</option>
            </select>
            </Field>
          </div>
          <div>
            <Field label="Posicionamento" labelClassName="mb-1 block text-zinc-500">
            <select
              value={bp.visualOverrides.header.position}
              onChange={(e) =>
                onUpdateBp((prev) => ({
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
              className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-zinc-800"
            >
              <option value="default">Padrão (Rola com a página)</option>
              <option value="sticky">Fixo ao rolar</option>
              <option value="overlay">Sobreposto ao Banner (Fixo)</option>
            </select>
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <ColorField
            label="Fundo do Cabeçalho"
            value={bp.visualOverrides.header.background}
            onChange={(v) =>
              onUpdateBp((prev) => ({
                ...prev,
                visualOverrides: {
                  ...prev.visualOverrides,
                  header: { ...prev.visualOverrides.header, background: v },
                },
              }))
            }
          />
          <ColorField
            label="Texto e Ícones"
            value={bp.visualOverrides.header.foreground}
            contrastWith={bp.visualOverrides.header.background}
            onChange={(v) =>
              onUpdateBp((prev) => ({
                ...prev,
                visualOverrides: {
                  ...prev.visualOverrides,
                  header: { ...prev.visualOverrides.header, foreground: v },
                },
              }))
            }
          />
        </div>

        <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-zinc-700">Opacidade do Fundo</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onUpdateBp((prev) => ({
                    ...prev,
                    visualOverrides: {
                      ...prev.visualOverrides,
                      header: { ...prev.visualOverrides.header, backgroundOpacity: 0 },
                    },
                  }))
                }
                className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-brand-600 hover:bg-brand-50"
              >
                100% Transparente
              </button>
              <strong className="font-mono text-zinc-900">
                {Math.round(bp.visualOverrides.header.backgroundOpacity * 100)}%
              </strong>
            </div>
          </div>
          <input
            aria-label="Opacidade do fundo do cabeçalho"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={bp.visualOverrides.header.backgroundOpacity}
            onChange={(e) =>
              onUpdateBp((prev) => ({
                ...prev,
                visualOverrides: {
                  ...prev.visualOverrides,
                  header: {
                    ...prev.visualOverrides.header,
                    backgroundOpacity: Number(e.target.value),
                  },
                },
              }))
            }
            className="w-full accent-brand-500"
          />
          <div className="pt-1">
            <div className="mb-0.5 flex justify-between text-zinc-600">
              <span>Desfoque de vidro (Blur)</span>
              <strong className="font-mono text-zinc-800">
                {bp.visualOverrides.header.backgroundOpacity <= 0
                  ? "0px (Transparente)"
                  : `${bp.visualOverrides.header.blurPx}px`}
              </strong>
            </div>
            <input
              aria-label="Desfoque de vidro (blur)"
              type="range"
              min={0}
              max={32}
              step={2}
              value={bp.visualOverrides.header.blurPx}
              onChange={(e) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  visualOverrides: {
                    ...prev.visualOverrides,
                    header: {
                      ...prev.visualOverrides.header,
                      blurPx: Number(e.target.value),
                    },
                  },
                }))
              }
              className="w-full accent-brand-500"
            />
          </div>
          <p className="text-[11px] text-zinc-500">
            A opacidade atua somente no fundo da navbar; a logo e os links permanecem nítidos.
          </p>
        </div>

        <HeaderLinksHoverControls bp={bp} onUpdateBp={onUpdateBp} />

        <button
          type="button"
          onClick={() => onSelect({ targetId: "header-logo", label: "Logotipo da Loja" })}
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
        >
          Editar Logotipo (Elemento Separado) →
        </button>

        <button
          type="button"
          onClick={() => onSelect({ targetId: "header-nav", label: "Menu de Categorias" })}
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
        >
          Editar itens do Menu de Categorias ({bp.sections.categories.length}) →
        </button>
      </div>
    </div>
  );
}
