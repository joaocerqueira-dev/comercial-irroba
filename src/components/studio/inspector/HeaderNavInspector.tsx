"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { HeaderLinksHoverControls } from "../HeaderLinksHoverControls";
import { Field } from "@/components/ui/Field";
import { CategoryAdder } from "../editors/CategoryAdder";
import type { InspectorTargetProps } from "./types";

/** Menu de categorias do cabeçalho. */
export function HeaderNavInspector({
  bp,
  onUpdateBp,
  categoryDraft,
  onCategoryDraftChange,
}: InspectorTargetProps) {
  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3">
      <HeaderLinksHoverControls bp={bp} onUpdateBp={onUpdateBp} />

      <div>
        <Field label="Formato do Texto das Categorias" labelClassName="mb-1 block font-semibold text-zinc-700">
        <select
          value={bp.visualOverrides.header.categoryCase}
          onChange={(e) =>
            onUpdateBp((prev) => ({
              ...prev,
              visualOverrides: {
                ...prev.visualOverrides,
                header: {
                  ...prev.visualOverrides.header,
                  categoryCase: e.target.value as
                    | "normal"
                    | "uppercase"
                    | "lowercase"
                    | "capitalize",
                },
              },
            }))
          }
          className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-zinc-800"
        >
          <option value="normal">Normal (como digitado)</option>
          <option value="uppercase">MAIÚSCULAS</option>
          <option value="capitalize">Primeira Maiúscula</option>
          <option value="lowercase">minúsculas</option>
        </select>
        </Field>
      </div>

      <div>
        <div className="mb-1 block font-semibold text-zinc-700">
          Itens do Menu Principal
        </div>
        <CategoryAdder
          value={categoryDraft}
          onValueChange={onCategoryDraftChange}
          onUpdateBp={onUpdateBp}
          submitOnEnter
          placeholder="Adicionar categoria..."
          className="mb-2 flex gap-1.5"
          inputClassName="flex-1 rounded-lg border border-zinc-200 px-2.5 py-1.5"
          buttonClassName="inline-flex items-center gap-1 rounded-lg bg-irroba-ink px-2.5 py-1.5 font-semibold text-white hover:bg-zinc-800"
          buttonContent={
            <>
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </>
          }
        />

        <div className="space-y-1.5">
          {bp.sections.categories.map((cat, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <input
                aria-label={`Categoria ${idx + 1}`}
                type="text"
                value={cat.label}
                onChange={(e) =>
                  onUpdateBp((prev) => ({
                    ...prev,
                    sections: {
                      ...prev.sections,
                      categories: prev.sections.categories.map((c, i) =>
                        i === idx ? { ...c, label: e.target.value } : c
                      ),
                    },
                  }))
                }
                className="min-w-0 flex-1 rounded border border-zinc-200 px-2 py-1 text-zinc-800"
              />
              <button
                type="button"
                aria-label="Mover categoria para cima"
                disabled={idx === 0}
                onClick={() =>
                  onUpdateBp((prev) => {
                    const arr = [...prev.sections.categories];
                    const [moved] = arr.splice(idx, 1);
                    if (!moved) return prev;
                    arr.splice(idx - 1, 0, moved);
                    return { ...prev, sections: { ...prev.sections, categories: arr } };
                  })
                }
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Mover categoria para baixo"
                disabled={idx === bp.sections.categories.length - 1}
                onClick={() =>
                  onUpdateBp((prev) => {
                    const arr = [...prev.sections.categories];
                    const [moved] = arr.splice(idx, 1);
                    if (!moved) return prev;
                    arr.splice(idx + 1, 0, moved);
                    return { ...prev, sections: { ...prev.sections, categories: arr } };
                  })
                }
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Remover categoria"
                onClick={() =>
                  onUpdateBp((prev) => ({
                    ...prev,
                    sections: {
                      ...prev.sections,
                      categories: prev.sections.categories.filter((_, i) => i !== idx),
                    },
                  }))
                }
                className="rounded p-1 text-zinc-400 hover:text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
