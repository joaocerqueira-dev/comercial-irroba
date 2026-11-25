"use client";

import { Trash2 } from "lucide-react";
import { HeaderLinksHoverControls } from "@/components/studio/HeaderLinksHoverControls";
import { CategoryAdder } from "@/components/studio/editors/CategoryAdder";
import type { StudioState } from "@/components/studio/useStudioState";

/** Menu de categorias da navbar (aba Seções). */
export function CategoryMenuPanel({ studio }: { studio: StudioState }) {
  const { bp, newCategoryName, setNewCategoryName, updateBp } = studio;

  return (
    <div className="space-y-2.5 rounded-xl border border-zinc-200 p-3">
      <div className="font-bold text-zinc-800">Categorias &amp; Links da Navbar</div>
      <HeaderLinksHoverControls bp={bp} onUpdateBp={updateBp} />
      <CategoryAdder
        value={newCategoryName}
        onValueChange={setNewCategoryName}
        onUpdateBp={updateBp}
        placeholder="Nova categoria..."
        className="flex gap-1.5"
        inputClassName="flex-1 rounded-lg border border-zinc-200 px-2.5 py-1"
        buttonClassName="rounded-lg bg-irroba-ink px-2.5 py-1 font-semibold text-white"
        buttonAriaLabel="Adicionar categoria"
        buttonContent="+"
      />
      <div className="space-y-1.5">
        {bp.sections.categories.map((cat, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <input
              aria-label={`Categoria ${idx + 1}`}
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
              className="flex-1 rounded border border-zinc-200 px-2 py-1"
            />
            <button
              type="button"
              aria-label={`Remover categoria ${idx + 1}`}
              onClick={() =>
                updateBp((prev) => ({
                  ...prev,
                  sections: {
                    ...prev.sections,
                    categories: prev.sections.categories.filter((_, i) => i !== idx),
                  },
                }))
              }
              className="p-1 text-zinc-400 hover:text-rose-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
