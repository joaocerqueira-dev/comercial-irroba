"use client";

import { AiImageSlot } from "../AiImageSlot";
import { Field } from "@/components/ui/Field";
import { CardStyleControls } from "./CardStyleControls";
import { findSelectedProduct } from "./types";
import type { InspectorTargetProps } from "./types";

/** Card de produto individual. */
export function ProductItemInspector({ previewId, bp, selection, onUpdateBp }: InspectorTargetProps) {
  const selectedProduct = findSelectedProduct(bp, selection);
  // Produto removido: o despachante limpa a seleção num efeito; até lá mostra o aviso
  if (!selectedProduct) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-3 text-zinc-500">
        Este produto não existe mais. Selecione outro elemento na prévia.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2.5 rounded-xl border border-zinc-200 bg-white p-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-zinc-800">Dados deste Produto</span>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700">
            <input
              type="checkbox"
              checked={selectedProduct.visible !== false}
              onChange={(e) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  products: prev.products.map((p) =>
                    p.id === selectedProduct.id ? { ...p, visible: e.target.checked } : p
                  ),
                }))
              }
            />
            Visível na loja
          </label>
        </div>

        <AiImageSlot
          previewId={previewId}
          label="Foto Principal do Produto (1:1)"
          value={selectedProduct.imageUrl}
          defaultAspectRatio="1:1"
          minRecommendedWidth={500}
          onChange={(nextUrl) =>
            onUpdateBp((prev) => ({
              ...prev,
              products: prev.products.map((p) =>
                p.id === selectedProduct.id
                  ? {
                      ...p,
                      imageUrl: nextUrl,
                      images: [nextUrl, ...(p.images ?? []).slice(1)],
                    }
                  : p
              ),
            }))
          }
        />

        <div>
          <Field label="Nome do Produto" labelClassName="mb-1 block text-zinc-500">
          <input
            type="text"
            value={selectedProduct.title}
            onChange={(e) =>
              onUpdateBp((prev) => ({
                ...prev,
                products: prev.products.map((p) =>
                  p.id === selectedProduct.id ? { ...p, title: e.target.value } : p
                ),
              }))
            }
            className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-zinc-900"
          />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Field label="Preço Atual (R$)" labelClassName="mb-1 block text-zinc-500">
            <input
              type="number"
              step="0.01"
              min={0}
              value={selectedProduct.price}
              onChange={(e) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  products: prev.products.map((p) =>
                    p.id === selectedProduct.id
                      ? { ...p, price: Math.max(0, Number(e.target.value) || 0) }
                      : p
                  ),
                }))
              }
              className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-zinc-900"
            />
            </Field>
          </div>
          <div>
            <Field label={<>Preço Antigo &quot;De&quot; (R$)</>} labelClassName="mb-1 block text-zinc-500">
            <input
              type="number"
              step="0.01"
              min={0}
              value={selectedProduct.compareAtPrice ?? ""}
              placeholder="Opcional"
              onChange={(e) => {
                const val = e.target.value.trim();
                onUpdateBp((prev) => ({
                  ...prev,
                  products: prev.products.map((p) =>
                    p.id === selectedProduct.id
                      ? {
                          ...p,
                          compareAtPrice: val ? Math.max(0, Number(val) || 0) : undefined,
                        }
                      : p
                  ),
                }));
              }}
              className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-zinc-900"
            />
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Field label="Categoria" labelClassName="mb-1 block text-zinc-500">
            <input
              type="text"
              value={selectedProduct.category}
              onChange={(e) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  products: prev.products.map((p) =>
                    p.id === selectedProduct.id ? { ...p, category: e.target.value } : p
                  ),
                }))
              }
              className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-zinc-900"
            />
            </Field>
          </div>
          <div>
            <Field label="Parcelamento" labelClassName="mb-1 block text-zinc-500">
            <input
              type="text"
              value={selectedProduct.installmentsText ?? ""}
              placeholder="Ex: 6x de R$ 49,90"
              onChange={(e) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  products: prev.products.map((p) =>
                    p.id === selectedProduct.id
                      ? { ...p, installmentsText: e.target.value }
                      : p
                  ),
                }))
              }
              className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-zinc-900"
            />
            </Field>
          </div>
        </div>
      </div>

      <CardStyleControls bp={bp} onUpdateBp={onUpdateBp} />
    </div>
  );
}
