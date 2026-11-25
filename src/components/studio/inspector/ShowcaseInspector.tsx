"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { CardStyleControls } from "./CardStyleControls";
import type { InspectorTargetProps } from "./types";

/** Vitrine principal e vitrines adicionais. */
export function ShowcaseInspector({ bp, selection, onUpdateBp, onSelect }: InspectorTargetProps) {
  const activeShowcaseIdx =
    selection.targetId === "showcase1"
      ? 0
      : selection.targetId === "extraShowcases"
        ? Math.max(1, selection.showcaseIdx ?? 1)
        : selection.showcaseIdx ?? 0;

  return (
    <div className="space-y-3">
      <div className="space-y-2.5 rounded-xl border border-zinc-200 bg-white p-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-zinc-800">Títulos das Vitrines</span>
          <button
            type="button"
            onClick={() =>
              onUpdateBp((prev) => ({
                ...prev,
                sections: {
                  ...prev.sections,
                  showcases: [
                    ...prev.sections.showcases,
                    {
                      title: `Seleção Especial ${prev.sections.showcases.length + 1}`,
                      subtitle: "Destaques escolhidos para você",
                      productIds: prev.products.slice(0, 4).map((p) => p.id),
                    },
                  ],
                },
              }))
            }
            className="inline-flex items-center gap-1 rounded-md bg-irroba-ink px-2 py-1 text-xs font-semibold text-white"
          >
            <Plus className="h-3 w-3" /> Vitrine
          </button>
        </div>

        {bp.sections.showcases.map((sc, idx) => (
          <div
            key={idx}
            className={`space-y-1.5 rounded-lg border p-2 ${
              idx === activeShowcaseIdx
                ? "border-brand-400 bg-brand-50/50"
                : "border-zinc-200 bg-zinc-50"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-600">
              <span>Vitrine {idx + 1}</span>
              {bp.sections.showcases.length > 1 && (
                <button
                  type="button"
                  aria-label="Remover vitrine"
                  onClick={() =>
                    onUpdateBp((prev) => ({
                      ...prev,
                      sections: {
                        ...prev.sections,
                        showcases: prev.sections.showcases.filter((_, i) => i !== idx),
                      },
                    }))
                  }
                  className="text-zinc-400 hover:text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <input
              aria-label="Título da vitrine"
              type="text"
              value={sc.title}
              placeholder="Título da vitrine"
              onChange={(e) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  sections: {
                    ...prev.sections,
                    showcases: prev.sections.showcases.map((item, i) =>
                      i === idx ? { ...item, title: e.target.value } : item
                    ),
                  },
                }))
              }
              className="w-full rounded border border-zinc-200 bg-white px-2 py-1 font-medium text-zinc-900"
            />
            <input
              aria-label="Subtítulo da vitrine"
              type="text"
              value={sc.subtitle ?? ""}
              placeholder="Subtítulo opcional"
              onChange={(e) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  sections: {
                    ...prev.sections,
                    showcases: prev.sections.showcases.map((item, i) =>
                      i === idx ? { ...item, subtitle: e.target.value } : item
                    ),
                  },
                }))
              }
              className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-zinc-700"
            />
          </div>
        ))}
      </div>

      <CardStyleControls bp={bp} onUpdateBp={onUpdateBp} />

      <div className="space-y-2 rounded-xl border border-zinc-200 bg-white p-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-zinc-800">
            Catálogo de Produtos ({bp.products.filter((p) => p.visible !== false).length}/
            {bp.products.length})
          </span>
          <button
            type="button"
            onClick={() => {
              const newId = `prod-custom-${Date.now()}`;
              onUpdateBp((prev) => ({
                ...prev,
                products: [
                  {
                    id: newId,
                    title: "Novo Produto",
                    price: 199.9,
                    imageUrl: prev.products[0]?.imageUrl ?? "",
                    images: prev.products[0]?.imageUrl ? [prev.products[0].imageUrl] : [],
                    category: prev.sections.categories[0]?.label ?? "Destaques",
                    categories: [prev.sections.categories[0]?.label ?? "Destaques"],
                    visible: true,
                  },
                  ...prev.products,
                ],
                sections: {
                  ...prev.sections,
                  showcases: prev.sections.showcases.map((sc, idx) =>
                    idx === 0 ? { ...sc, productIds: [newId, ...sc.productIds] } : sc
                  ),
                },
              }));
              onSelect({
                targetId: "product-item",
                productId: newId,
                label: "Produto: Novo Produto",
              });
            }}
            className="inline-flex items-center gap-1 rounded-md bg-brand-500 px-2 py-1 text-xs font-bold text-white hover:bg-brand-600"
          >
            <Plus className="h-3 w-3" /> Produto
          </button>
        </div>

        <div className="max-h-56 space-y-1.5 overflow-y-auto">
          {bp.products.map((prod) => (
            <div
              key={prod.id}
              className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-2 py-1.5"
            >
              <input
                aria-label={`Exibir ${prod.title}`}
                type="checkbox"
                checked={prod.visible !== false}
                onChange={(e) =>
                  onUpdateBp((prev) => ({
                    ...prev,
                    products: prev.products.map((p) =>
                      p.id === prod.id ? { ...p, visible: e.target.checked } : p
                    ),
                  }))
                }
              />
              <span className="flex-1 truncate text-zinc-700">{prod.title}</span>
              <button
                type="button"
                onClick={() =>
                  onSelect({
                    targetId: "product-item",
                    productId: prod.id,
                    label: `Produto: ${prod.title.slice(0, 26)}`,
                  })
                }
                className="inline-flex items-center gap-1 rounded border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-700 hover:bg-brand-50 hover:text-brand-700"
              >
                <Pencil className="h-2.5 w-2.5" />
                Editar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
