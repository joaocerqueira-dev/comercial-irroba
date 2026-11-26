"use client";

import { Field } from "@/components/ui/Field";
import { CardStyleControls } from "./CardStyleControls";
import type { InspectorTargetProps } from "./types";

/** Página de produto (PDP). */
export function PdpInspector({ bp, onUpdateBp }: InspectorTargetProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-2.5 rounded-xl border border-zinc-200 bg-white p-3">
        <div>
          <Field label="Orientação da Galeria de Fotos" labelClassName="mb-1 block font-semibold text-zinc-700">
          <select
            value={bp.visualOverrides.pageProduct.galleryOrientation}
            onChange={(e) =>
              onUpdateBp((prev) => ({
                ...prev,
                visualOverrides: {
                  ...prev.visualOverrides,
                  pageProduct: {
                    ...prev.visualOverrides.pageProduct,
                    galleryOrientation: e.target.value as "vertical" | "horizontal",
                  },
                },
              }))
            }
            className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-zinc-800"
          >
            <option value="vertical">Vertical (Miniaturas à esquerda)</option>
            <option value="horizontal">Horizontal (Miniaturas abaixo)</option>
          </select>
          </Field>
        </div>
      </div>

      <CardStyleControls bp={bp} onUpdateBp={onUpdateBp} />
    </div>
  );
}
