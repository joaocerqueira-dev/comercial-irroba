"use client";

import { ColorField } from "@/components/studio/ColorField";
import { HeaderLinksHoverControls } from "@/components/studio/HeaderLinksHoverControls";
import { Field } from "@/components/ui/Field";
import type { StudioState } from "@/components/studio/useStudioState";

/** Aba Cores/Botões: tokens de cor, botões, cards, tarja, cabeçalho e rodapé. */
export function ColorsTab({ studio }: { studio: StudioState }) {
  const {
    bp,
    updateBp,
  } = studio;

  return (
    <div className="space-y-4">
      <div className="space-y-2.5 rounded-xl border border-zinc-200 p-3">
        <div className="font-bold text-zinc-800">8 Tokens de Cor (Tema LIME)</div>
        <div className="grid grid-cols-2 gap-2.5">
          <ColorField
            label="Cor Primária"
            value={bp.theme.primaryBackground}
            onChange={(v) =>
              updateBp((prev) => ({
                ...prev,
                theme: { ...prev.theme, primaryBackground: v },
              }))
            }
          />
          <ColorField
            label="Texto s/ Primária"
            value={bp.theme.primaryForeground}
            contrastWith={bp.theme.primaryBackground}
            onChange={(v) =>
              updateBp((prev) => ({
                ...prev,
                theme: { ...prev.theme, primaryForeground: v },
              }))
            }
          />
          <ColorField
            label="Cor Secundária"
            value={bp.theme.secondaryBackground}
            onChange={(v) =>
              updateBp((prev) => ({
                ...prev,
                theme: { ...prev.theme, secondaryBackground: v },
              }))
            }
          />
          <ColorField
            label="Texto s/ Secundária"
            value={bp.theme.secondaryForeground}
            contrastWith={bp.theme.secondaryBackground}
            onChange={(v) =>
              updateBp((prev) => ({
                ...prev,
                theme: { ...prev.theme, secondaryForeground: v },
              }))
            }
          />
          <ColorField
            label="Cor Neutra (Faixas)"
            value={bp.theme.neutralBackground}
            onChange={(v) =>
              updateBp((prev) => ({
                ...prev,
                theme: { ...prev.theme, neutralBackground: v },
              }))
            }
          />
          <ColorField
            label="Texto s/ Neutra"
            value={bp.theme.neutralForeground}
            contrastWith={bp.theme.neutralBackground}
            onChange={(v) =>
              updateBp((prev) => ({
                ...prev,
                theme: { ...prev.theme, neutralForeground: v },
              }))
            }
          />
          <ColorField
            label="Fundo Padrão"
            value={bp.theme.bodyBackground}
            onChange={(v) =>
              updateBp((prev) => ({
                ...prev,
                theme: { ...prev.theme, bodyBackground: v },
              }))
            }
          />
          <ColorField
            label="Texto s/ Fundo"
            value={bp.theme.bodyForeground}
            contrastWith={bp.theme.bodyBackground}
            onChange={(v) =>
              updateBp((prev) => ({
                ...prev,
                theme: { ...prev.theme, bodyForeground: v },
              }))
            }
          />
        </div>
      </div>

      {/* Botões e Cards */}
      <div className="space-y-3 rounded-xl border border-zinc-200 p-3">
        <div className="font-bold text-zinc-800">Botões (Primário, Secundário &amp; Comprar)</div>

        <div className="grid grid-cols-2 gap-2.5">
          <ColorField
            label="Botão Primário (Fundo)"
            value={bp.theme.btnPrimaryBackground}
            onChange={(v) =>
              updateBp((prev) => ({
                ...prev,
                theme: { ...prev.theme, btnPrimaryBackground: v },
              }))
            }
          />
          <ColorField
            label="Botão Primário (Texto)"
            value={bp.theme.btnPrimaryColor}
            contrastWith={bp.theme.btnPrimaryBackground}
            onChange={(v) =>
              updateBp((prev) => ({
                ...prev,
                theme: { ...prev.theme, btnPrimaryColor: v },
              }))
            }
          />
          <ColorField
            label="Botão Secundário (Fundo)"
            value={bp.theme.btnSecondaryBackground}
            onChange={(v) =>
              updateBp((prev) => ({
                ...prev,
                theme: { ...prev.theme, btnSecondaryBackground: v },
              }))
            }
          />
          <ColorField
            label="Botão Secundário (Texto)"
            value={bp.theme.btnSecondaryColor}
            contrastWith={bp.theme.btnSecondaryBackground}
            onChange={(v) =>
              updateBp((prev) => ({
                ...prev,
                theme: { ...prev.theme, btnSecondaryColor: v },
              }))
            }
          />
        </div>

        <label className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            checked={bp.theme.btnSecondaryOutline}
            onChange={(e) =>
              updateBp((prev) => ({
                ...prev,
                theme: { ...prev.theme, btnSecondaryOutline: e.target.checked },
              }))
            }
          />
          <span className="font-medium text-zinc-700">
            Botão secundário com contorno (outline)
          </span>
        </label>

        <div className="border-t border-zinc-100 pt-2.5">
          <div className="mb-2 font-semibold text-zinc-700">Botão Comprar dos Produtos</div>
          <div className="mb-2">
            <Field label="Texto do Botão" labelClassName="mb-1 block text-zinc-500">
            <input
              type="text"
              value={bp.visualOverrides.pageProduct.buyButtonText}
              onChange={(e) =>
                updateBp((prev) => ({
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
          <div className="grid grid-cols-2 gap-2.5">
            <ColorField
              label="Comprar (Fundo)"
              value={bp.visualOverrides.productCard.buyBtnBackground}
              onChange={(v) =>
                updateBp((prev) => ({
                  ...prev,
                  visualOverrides: {
                    ...prev.visualOverrides,
                    productCard: {
                      ...prev.visualOverrides.productCard,
                      buyBtnBackground: v,
                    },
                  },
                }))
              }
            />
            <ColorField
              label="Comprar (Texto)"
              value={bp.visualOverrides.productCard.buyBtnForeground}
              contrastWith={bp.visualOverrides.productCard.buyBtnBackground}
              onChange={(v) =>
                updateBp((prev) => ({
                  ...prev,
                  visualOverrides: {
                    ...prev.visualOverrides,
                    productCard: {
                      ...prev.visualOverrides.productCard,
                      buyBtnForeground: v,
                    },
                  },
                }))
              }
            />
            <ColorField
              label="Comprar (Borda)"
              value={bp.visualOverrides.productCard.buyBtnBorder}
              onChange={(v) =>
                updateBp((prev) => ({
                  ...prev,
                  visualOverrides: {
                    ...prev.visualOverrides,
                    productCard: {
                      ...prev.visualOverrides.productCard,
                      buyBtnBorder: v,
                    },
                  },
                }))
              }
            />
            <ColorField
              label="Fundo dos Cards"
              value={bp.visualOverrides.productCard.cardBackground}
              onChange={(v) =>
                updateBp((prev) => ({
                  ...prev,
                  visualOverrides: {
                    ...prev.visualOverrides,
                    productCard: {
                      ...prev.visualOverrides.productCard,
                      cardBackground: v,
                    },
                  },
                }))
              }
            />
            <ColorField
              label="Cor do Preço"
              value={bp.visualOverrides.productCard.priceColor}
              onChange={(v) =>
                updateBp((prev) => ({
                  ...prev,
                  visualOverrides: {
                    ...prev.visualOverrides,
                    productCard: {
                      ...prev.visualOverrides.productCard,
                      priceColor: v,
                    },
                  },
                }))
              }
            />
            <ColorField
              label="Preço Antigo"
              value={bp.visualOverrides.productCard.oldPriceColor}
              onChange={(v) =>
                updateBp((prev) => ({
                  ...prev,
                  visualOverrides: {
                    ...prev.visualOverrides,
                    productCard: {
                      ...prev.visualOverrides.productCard,
                      oldPriceColor: v,
                    },
                  },
                }))
              }
            />
          </div>
        </div>
      </div>

      {/* Tarja, Cabeçalho & Rodapé */}
      <div className="space-y-2.5 rounded-xl border border-zinc-200 p-3">
        <div className="font-bold text-zinc-800">Tarja, Cabeçalho &amp; Rodapé</div>
        <div className="grid grid-cols-2 gap-2.5">
          <ColorField
            label="Tarja (Fundo)"
            value={bp.visualOverrides.announcement.background}
            onChange={(v) =>
              updateBp((prev) => ({
                ...prev,
                visualOverrides: {
                  ...prev.visualOverrides,
                  announcement: { ...prev.visualOverrides.announcement, background: v },
                },
              }))
            }
          />
          <ColorField
            label="Tarja (Texto)"
            value={bp.visualOverrides.announcement.foreground}
            contrastWith={bp.visualOverrides.announcement.background}
            onChange={(v) =>
              updateBp((prev) => ({
                ...prev,
                visualOverrides: {
                  ...prev.visualOverrides,
                  announcement: { ...prev.visualOverrides.announcement, foreground: v },
                },
              }))
            }
          />
          <ColorField
            label="Cabeçalho (Fundo)"
            value={bp.visualOverrides.header.background}
            onChange={(v) =>
              updateBp((prev) => ({
                ...prev,
                visualOverrides: {
                  ...prev.visualOverrides,
                  header: { ...prev.visualOverrides.header, background: v },
                },
              }))
            }
          />
          <ColorField
            label="Cabeçalho (Texto)"
            value={bp.visualOverrides.header.foreground}
            contrastWith={bp.visualOverrides.header.background}
            onChange={(v) =>
              updateBp((prev) => ({
                ...prev,
                visualOverrides: {
                  ...prev.visualOverrides,
                  header: { ...prev.visualOverrides.header, foreground: v },
                },
              }))
            }
          />
          <ColorField
            label="Rodapé (Fundo)"
            value={bp.visualOverrides.footer.background}
            onChange={(v) =>
              updateBp((prev) => ({
                ...prev,
                visualOverrides: {
                  ...prev.visualOverrides,
                  footer: { ...prev.visualOverrides.footer, background: v },
                },
              }))
            }
          />
          <ColorField
            label="Rodapé (Texto)"
            value={bp.visualOverrides.footer.foreground}
            contrastWith={bp.visualOverrides.footer.background}
            onChange={(v) =>
              updateBp((prev) => ({
                ...prev,
                visualOverrides: {
                  ...prev.visualOverrides,
                  footer: { ...prev.visualOverrides.footer, foreground: v },
                },
              }))
            }
          />
          <ColorField
            label="Faixa Legal (Fundo)"
            value={bp.visualOverrides.footer.legalBackground}
            onChange={(v) =>
              updateBp((prev) => ({
                ...prev,
                visualOverrides: {
                  ...prev.visualOverrides,
                  footer: { ...prev.visualOverrides.footer, legalBackground: v },
                },
              }))
            }
          />
          <ColorField
            label="Faixa Legal (Texto)"
            value={bp.visualOverrides.footer.legalForeground}
            contrastWith={bp.visualOverrides.footer.legalBackground}
            onChange={(v) =>
              updateBp((prev) => ({
                ...prev,
                visualOverrides: {
                  ...prev.visualOverrides,
                  footer: { ...prev.visualOverrides.footer, legalForeground: v },
                },
              }))
            }
          />
        </div>

        <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-zinc-700">Opacidade do Cabeçalho</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  updateBp((prev) => ({
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
              updateBp((prev) => ({
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
        </div>

        <HeaderLinksHoverControls bp={bp} onUpdateBp={updateBp} />
      </div>
    </div>
  );
}
