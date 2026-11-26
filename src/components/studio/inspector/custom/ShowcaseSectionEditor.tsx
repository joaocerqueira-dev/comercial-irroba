"use client";

import { Field } from "@/components/ui/Field";
import type { CustomSection, StoreBlueprint } from "@/lib/types/blueprint";
import type { CustomSectionUpdater } from "./types";

/** Editor da seção personalizada do tipo "showcase". */
export function ShowcaseSectionEditor({
  section: activeCustomSection,
  update: updateCustomSection,
  bp,
}: {
  section: Extract<CustomSection, { kind: "showcase" }>;
  update: CustomSectionUpdater;
  bp: StoreBlueprint;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Field label="Subtítulo" labelClassName="mb-1 block text-zinc-500">
          <input
            type="text"
            value={activeCustomSection.subtitle ?? ""}
            onChange={(e) =>
              updateCustomSection((cs) => (cs.kind === "showcase" ? { ...cs, subtitle: e.target.value } : cs))
            }
            className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Field label="Categoria Base" labelClassName="mb-1 block text-zinc-500">
            <select
              value={activeCustomSection.categoryFilter ?? ""}
              onChange={(e) =>
                updateCustomSection((cs) =>
                  cs.kind === "showcase" ? { ...cs, categoryFilter: e.target.value || undefined } : cs
                )
              }
              className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5"
            >
              <option value="">Usar seleção manual</option>
              {bp.sections.categories.map((cat) => (
                <option key={cat.label} value={cat.label}>
                  {cat.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div>
          <Field label="Limite de Produtos" labelClassName="mb-1 block text-zinc-500">
            <input
              type="number"
              min={1}
              max={24}
              value={activeCustomSection.limit}
              onChange={(e) =>
                updateCustomSection((cs) =>
                  cs.kind === "showcase"
                    ? {
                        ...cs,
                        limit: Math.max(1, Math.min(24, Number(e.target.value) || 8)),
                      }
                    : cs
                )
              }
              className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
            />
          </Field>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="text-[11px] font-semibold text-zinc-600">
          Produtos Fixados ({activeCustomSection.productIds.length})
        </div>
        <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 p-2">
          {bp.products.slice(0, 24).map((prod) => {
            const checked = activeCustomSection.productIds.includes(prod.id);
            return (
              <label key={prod.id} className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    updateCustomSection((cs) => {
                      if (cs.kind !== "showcase") return cs;
                      const nextIds = e.target.checked
                        ? [...cs.productIds, prod.id]
                        : cs.productIds.filter((pid) => pid !== prod.id);
                      return { ...cs, productIds: nextIds };
                    })
                  }
                  className="rounded border-zinc-300"
                />
                <span className="truncate">{prod.title}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
