"use client";

import type { StoreBlueprint } from "@/lib/types/blueprint";
import { ColorField } from "../ColorField";
import { Field } from "@/components/ui/Field";

interface CardStyleControlsProps {
  bp: StoreBlueprint;
  onUpdateBp: (updater: (prev: StoreBlueprint) => StoreBlueprint) => void;
}

/** Estilo dos cards de produto e do botão Comprar (vitrines, card, botão e PDP). */
export function CardStyleControls({ bp, onUpdateBp }: CardStyleControlsProps) {
  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3">
      <div className="font-bold text-zinc-800">Estilo dos Cards &amp; Botão Comprar</div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Field label="Largura da Vitrine" labelClassName="mb-1 block text-zinc-500">
          <select
            value={bp.visualOverrides.productCard.listWidth}
            onChange={(e) =>
              onUpdateBp((prev) => ({
                ...prev,
                visualOverrides: {
                  ...prev.visualOverrides,
                  productCard: {
                    ...prev.visualOverrides.productCard,
                    listWidth: e.target.value as "container" | "full",
                  },
                },
              }))
            }
            className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-zinc-800"
          >
            <option value="container">Padrão (1280px)</option>
            <option value="full">Largura Total</option>
          </select>
          </Field>
        </div>

        <div>
          <Field label="Alinhamento Título" labelClassName="mb-1 block text-zinc-500">
          <select
            value={bp.visualOverrides.productCard.titleAlign}
            onChange={(e) =>
              onUpdateBp((prev) => ({
                ...prev,
                visualOverrides: {
                  ...prev.visualOverrides,
                  productCard: {
                    ...prev.visualOverrides.productCard,
                    titleAlign: e.target.value as "left" | "center" | "right",
                  },
                },
              }))
            }
            className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-zinc-800"
          >
            <option value="left">Esquerda</option>
            <option value="center">Centro</option>
            <option value="right">Direita</option>
          </select>
          </Field>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Field label="Padding Lateral Card" labelClassName="mb-1 block text-zinc-500">
          <select
            value={bp.visualOverrides.productCard.paddingX}
            onChange={(e) =>
              onUpdateBp((prev) => ({
                ...prev,
                visualOverrides: {
                  ...prev.visualOverrides,
                  productCard: {
                    ...prev.visualOverrides.productCard,
                    paddingX: Number(e.target.value) as 8 | 16 | 24 | 40,
                  },
                },
              }))
            }
            className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-zinc-800"
          >
            <option value={8}>Compacto (8px)</option>
            <option value={16}>Padrão (16px)</option>
            <option value={24}>Amplo (24px)</option>
            <option value={40}>Editorial (40px)</option>
          </select>
          </Field>
        </div>

        <div>
          <Field label="Texto do Botão" labelClassName="mb-1 block text-zinc-500">
          <input
            type="text"
            value={bp.visualOverrides.pageProduct.buyButtonText}
            onChange={(e) =>
              onUpdateBp((prev) => ({
                ...prev,
                visualOverrides: {
                  ...prev.visualOverrides,
                  pageProduct: {
                    ...prev.visualOverrides.pageProduct,
                    buyButtonText: e.target.value,
                  },
                },
              }))
            }
            className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-zinc-900"
          />
          </Field>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <ColorField
          label="Comprar (Fundo)"
          value={bp.visualOverrides.productCard.buyBtnBackground}
          onChange={(v) =>
            onUpdateBp((prev) => ({
              ...prev,
              visualOverrides: {
                ...prev.visualOverrides,
                productCard: { ...prev.visualOverrides.productCard, buyBtnBackground: v },
              },
            }))
          }
        />
        <ColorField
          label="Comprar (Texto)"
          value={bp.visualOverrides.productCard.buyBtnForeground}
          contrastWith={bp.visualOverrides.productCard.buyBtnBackground}
          onChange={(v) =>
            onUpdateBp((prev) => ({
              ...prev,
              visualOverrides: {
                ...prev.visualOverrides,
                productCard: { ...prev.visualOverrides.productCard, buyBtnForeground: v },
              },
            }))
          }
        />
        <ColorField
          label="Comprar (Borda)"
          value={bp.visualOverrides.productCard.buyBtnBorder}
          onChange={(v) =>
            onUpdateBp((prev) => ({
              ...prev,
              visualOverrides: {
                ...prev.visualOverrides,
                productCard: { ...prev.visualOverrides.productCard, buyBtnBorder: v },
              },
            }))
          }
        />
        <ColorField
          label="Fundo do Card"
          value={bp.visualOverrides.productCard.cardBackground}
          onChange={(v) =>
            onUpdateBp((prev) => ({
              ...prev,
              visualOverrides: {
                ...prev.visualOverrides,
                productCard: { ...prev.visualOverrides.productCard, cardBackground: v },
              },
            }))
          }
        />
        <ColorField
          label="Cor do Preço"
          value={bp.visualOverrides.productCard.priceColor}
          onChange={(v) =>
            onUpdateBp((prev) => ({
              ...prev,
              visualOverrides: {
                ...prev.visualOverrides,
                productCard: { ...prev.visualOverrides.productCard, priceColor: v },
              },
            }))
          }
        />
        <ColorField
          label="Preço Antigo"
          value={bp.visualOverrides.productCard.oldPriceColor}
          onChange={(v) =>
            onUpdateBp((prev) => ({
              ...prev,
              visualOverrides: {
                ...prev.visualOverrides,
                productCard: { ...prev.visualOverrides.productCard, oldPriceColor: v },
              },
            }))
          }
        />
      </div>
    </div>
  );
}
