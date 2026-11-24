"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Download,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { getNormalizedSectionLayout, type SectionKey, type StoreBlueprint } from "@/lib/types/blueprint";
import { AiImageSlot } from "./AiImageSlot";
import { AnnouncementBarControls } from "./AnnouncementBarControls";
import { BannerDimensionsControl } from "./BannerDimensionsControl";
import { ColorField } from "./ColorField";
import { HeaderLinksHoverControls } from "./HeaderLinksHoverControls";
import { INSPECTOR_META, type InspectorSelection } from "./inspectorTargets";

interface ElementInspectorPanelProps {
  previewId: string;
  bp: StoreBlueprint;
  selection: InspectorSelection;
  onUpdateBp: (updater: (prev: StoreBlueprint) => StoreBlueprint) => void;
  onSelect: (next: InspectorSelection | null) => void;
  onToggleSection: (sectionId: SectionKey) => void;
  onMoveSection: (fromIdx: number, toIdx: number) => void;
  onDownloadBenefitsPng: () => void;
  onShowSlide?: (slideIdx: number) => void;
}

export function ElementInspectorPanel({
  previewId,
  bp,
  selection,
  onUpdateBp,
  onSelect,
  onToggleSection,
  onMoveSection,
  onDownloadBenefitsPng,
  onShowSlide,
}: ElementInspectorPanelProps) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const meta = INSPECTOR_META[selection.targetId];
  const sectionLayout = getNormalizedSectionLayout(bp.sections.layout);
  const sectionIdx = meta.sectionKey
    ? sectionLayout.findIndex((s) => s.id === meta.sectionKey)
    : -1;
  const sectionEntry = sectionIdx >= 0 ? sectionLayout[sectionIdx] : null;

  const activeShowcaseIdx =
    selection.targetId === "showcase1"
      ? 0
      : selection.targetId === "extraShowcases"
        ? Math.max(1, selection.showcaseIdx ?? 1)
        : selection.showcaseIdx ?? 0;

  const selectedProduct =
    selection.targetId === "product-item" && selection.productId
      ? bp.products.find((p) => p.id === selection.productId) ?? bp.products[0]
      : null;

  const renderCardAndBuyButtonControls = () => (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="font-bold text-slate-800">Estilo dos Cards &amp; Botão Comprar</div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-slate-500">Largura da Vitrine</label>
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
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-800"
          >
            <option value="container">Padrão (1280px)</option>
            <option value="full">Largura Total</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-slate-500">Alinhamento Título</label>
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
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-800"
          >
            <option value="left">Esquerda</option>
            <option value="center">Centro</option>
            <option value="right">Direita</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-slate-500">Padding Lateral Card</label>
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
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-800"
          >
            <option value={8}>Compacto (8px)</option>
            <option value={16}>Padrão (16px)</option>
            <option value={24}>Amplo (24px)</option>
            <option value={40}>Editorial (40px)</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-slate-500">Texto do Botão</label>
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
            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-900"
          />
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

  return (
    <div className="space-y-3.5">
      {/* Sticky Element Context Header */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/75 p-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Todos os elementos
          </button>

          {sectionEntry && meta.sectionKey && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={sectionIdx <= 0}
                onClick={() => onMoveSection(sectionIdx, sectionIdx - 1)}
                title="Subir seção na página"
                className="rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-35"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={sectionIdx < 0 || sectionIdx >= sectionLayout.length - 1}
                onClick={() => onMoveSection(sectionIdx, sectionIdx + 1)}
                title="Descer seção na página"
                className="rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-35"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onToggleSection(meta.sectionKey!)}
                className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-semibold ${
                  sectionEntry.enabled
                    ? "border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50"
                    : "border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {sectionEntry.enabled ? (
                  <>
                    <Eye className="h-3 w-3" />
                    Visível
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3 w-3" />
                    Oculta
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="mt-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            {meta.irrobaRef}
          </div>
          <div className="text-sm font-bold text-slate-900">
            {selection.label || meta.title}
          </div>
        </div>
      </div>

      {/* 1. BARRA DE AVISO / OVERLINE */}
      {selection.targetId === "announcement" && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
          <AnnouncementBarControls bp={bp} onUpdateBp={onUpdateBp} />
        </div>
      )}

      {/* 2. LOGOTIPO DA LOJA */}
      {selection.targetId === "header-logo" && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
          <div>
            <label className="mb-1 block font-semibold text-slate-700">Nome da Loja</label>
            <input
              type="text"
              value={bp.brand.name}
              onChange={(e) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  brand: { ...prev.brand, name: e.target.value },
                }))
              }
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-900"
            />
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

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
            <div className="mb-1 flex items-center justify-between text-slate-700">
              <span className="font-semibold">Altura da Logo (PX)</span>
              <strong className="font-mono text-slate-900">
                {bp.visualOverrides.header.logoHeightPx ?? 46}px
              </strong>
            </div>
            <input
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
              className="w-full accent-emerald-600"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              A logo é um elemento independente e mantém 100% de nitidez mesmo com a navbar transparente.
            </p>
          </div>

          <div>
            <label className="mb-1 block font-semibold text-slate-700">
              Posição da Logo no Cabeçalho
            </label>
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
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-800"
            >
              <option value="layout-1">Layout 1 — Logo à esquerda + Menu na linha</option>
              <option value="layout-2">Layout 2 — Logo centralizada + Menu abaixo</option>
              <option value="layout-3">Layout 3 — Logo à esquerda + Menu em barra inferior</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => onSelect({ targetId: "header", label: "Cabeçalho" })}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Editar cores, opacidade e posicionamento do Cabeçalho →
          </button>
        </div>
      )}

      {/* 3. MENU DE CATEGORIAS */}
      {selection.targetId === "header-nav" && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
          <HeaderLinksHoverControls bp={bp} onUpdateBp={onUpdateBp} />

          <div>
            <label className="mb-1 block font-semibold text-slate-700">
              Formato do Texto das Categorias
            </label>
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
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-800"
            >
              <option value="normal">Normal (como digitado)</option>
              <option value="uppercase">MAIÚSCULAS</option>
              <option value="capitalize">Primeira Maiúscula</option>
              <option value="lowercase">minúsculas</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block font-semibold text-slate-700">
              Itens do Menu Principal
            </label>
            <div className="mb-2 flex gap-1.5">
              <input
                type="text"
                placeholder="Adicionar categoria..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const label = newCategoryName.trim();
                    if (!label) return;
                    onUpdateBp((prev) => ({
                      ...prev,
                      sections: {
                        ...prev.sections,
                        categories: [
                          ...prev.sections.categories,
                          { label, href: `#cat-${prev.sections.categories.length + 1}` },
                        ],
                      },
                    }));
                    setNewCategoryName("");
                  }
                }}
                className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5"
              />
              <button
                type="button"
                onClick={() => {
                  const label = newCategoryName.trim();
                  if (!label) return;
                  onUpdateBp((prev) => ({
                    ...prev,
                    sections: {
                      ...prev.sections,
                      categories: [
                        ...prev.sections.categories,
                        { label, href: `#cat-${prev.sections.categories.length + 1}` },
                      ],
                    },
                  }));
                  setNewCategoryName("");
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 font-semibold text-white hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar
              </button>
            </div>

            <div className="space-y-1.5">
              {bp.sections.categories.map((cat, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <input
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
                    className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-slate-800"
                  />
                  <button
                    type="button"
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
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
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
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateBp((prev) => ({
                        ...prev,
                        sections: {
                          ...prev.sections,
                          categories: prev.sections.categories.filter((_, i) => i !== idx),
                        },
                      }))
                    }
                    className="rounded p-1 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. CABEÇALHO COMPLETO */}
      {selection.targetId === "header" && (
        <div className="space-y-3">
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-slate-500">Estrutura</label>
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
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-800"
                >
                  <option value="layout-1">Layout 1 (Linha)</option>
                  <option value="layout-2">Layout 2 (Central)</option>
                  <option value="layout-3">Layout 3 (Duplo)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-slate-500">Posicionamento</label>
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
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-800"
                >
                  <option value="default">Padrão (Rola com a página)</option>
                  <option value="sticky">Fixo ao rolar</option>
                  <option value="overlay">Sobreposto ao Banner (Fixo)</option>
                </select>
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

            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-700">Opacidade do Fundo</span>
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
                    className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-50"
                  >
                    100% Transparente
                  </button>
                  <strong className="font-mono text-slate-900">
                    {Math.round(bp.visualOverrides.header.backgroundOpacity * 100)}%
                  </strong>
                </div>
              </div>
              <input
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
                className="w-full accent-emerald-600"
              />
              <div className="pt-1">
                <div className="mb-0.5 flex justify-between text-slate-600">
                  <span>Desfoque de vidro (Blur)</span>
                  <strong className="font-mono text-slate-800">
                    {bp.visualOverrides.header.backgroundOpacity <= 0
                      ? "0px (Transparente)"
                      : `${bp.visualOverrides.header.blurPx}px`}
                  </strong>
                </div>
                <input
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
                  className="w-full accent-emerald-600"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                A opacidade atua somente no fundo da navbar; a logo e os links permanecem nítidos.
              </p>
            </div>

            <HeaderLinksHoverControls bp={bp} onUpdateBp={onUpdateBp} />

            <button
              type="button"
              onClick={() => onSelect({ targetId: "header-logo", label: "Logotipo da Loja" })}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Editar Logotipo (Elemento Separado) →
            </button>

            <button
              type="button"
              onClick={() => onSelect({ targetId: "header-nav", label: "Menu de Categorias" })}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Editar itens do Menu de Categorias ({bp.sections.categories.length}) →
            </button>
          </div>
        </div>
      )}

      {/* 5. BANNER PRINCIPAL (HERO CAROUSEL) */}
      {selection.targetId === "hero" && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
          <BannerDimensionsControl
            title="Tamanho de Exibição do Banner Principal (PX)"
            heightPx={bp.visualOverrides.banner.heightPx}
            defaultHeightPx={500}
            minHeightPx={160}
            maxHeightPx={1100}
            widthPx={
              bp.visualOverrides.banner.customWidthPx ??
              (bp.visualOverrides.banner.width === "container" ? 1280 : undefined)
            }
            defaultWidthPx={1280}
            isFullWidth={
              bp.visualOverrides.banner.width === "full" &&
              bp.visualOverrides.banner.customWidthPx === undefined
            }
            onFullWidthChange={(full) =>
              onUpdateBp((prev) => ({
                ...prev,
                visualOverrides: {
                  ...prev.visualOverrides,
                  banner: {
                    ...prev.visualOverrides.banner,
                    width: full ? "full" : "container",
                    customWidthPx: full ? undefined : prev.visualOverrides.banner.customWidthPx ?? 1280,
                  },
                },
              }))
            }
            objectFit={bp.visualOverrides.banner.objectFit}
            onHeightChange={(h) =>
              onUpdateBp((prev) => ({
                ...prev,
                visualOverrides: {
                  ...prev.visualOverrides,
                  banner: { ...prev.visualOverrides.banner, heightPx: h },
                },
              }))
            }
            onWidthChange={(w) =>
              onUpdateBp((prev) => ({
                ...prev,
                visualOverrides: {
                  ...prev.visualOverrides,
                  banner: {
                    ...prev.visualOverrides.banner,
                    width: w ? "container" : "full",
                    customWidthPx: w,
                  },
                },
              }))
            }
            onObjectFitChange={(fit) =>
              onUpdateBp((prev) => ({
                ...prev,
                visualOverrides: {
                  ...prev.visualOverrides,
                  banner: { ...prev.visualOverrides.banner, objectFit: fit },
                },
              }))
            }
          />

          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-slate-800">Slides do Banner Principal</span>

            <button
              type="button"
              onClick={() => {
                const nextIdx = bp.sections.heroSlides.length;
                onUpdateBp((prev) => ({
                  ...prev,
                  sections: {
                    ...prev.sections,
                    heroSlides: [
                      ...prev.sections.heroSlides,
                      {
                        id: `slide-${Date.now()}`,
                        imageUrl: prev.sections.hero.imageUrl,
                        headline: `Novidades ${prev.brand.name}`,
                        subheadline: "Confira os lançamentos exclusivos da temporada.",
                        ctaText: "Ver Coleção",
                        ctaHref: "#vitrines",
                        mode: "editorial",
                        enabled: true,
                      },
                    ],
                  },
                }));
                onShowSlide?.(nextIdx);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo Slide
            </button>
          </div>

          {bp.sections.heroSlides.map((slide, idx) => (
            <div
              key={slide.id}
              onClick={() => onShowSlide?.(idx)}
              className={`space-y-2 rounded-lg border p-2.5 transition ${
                selection.subIndex === idx
                  ? "border-emerald-400 bg-emerald-50/40"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={slide.enabled}
                    onChange={(e) =>
                      onUpdateBp((prev) => ({
                        ...prev,
                        sections: {
                          ...prev.sections,
                          heroSlides: prev.sections.heroSlides.map((s, i) =>
                            i === idx ? { ...s, enabled: e.target.checked } : s
                          ),
                        },
                      }))
                    }
                  />
                  Slide {idx + 1}
                </label>
                {bp.sections.heroSlides.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateBp((prev) => ({
                        ...prev,
                        sections: {
                          ...prev.sections,
                          heroSlides: prev.sections.heroSlides.filter((_, i) => i !== idx),
                        },
                      }))
                    }
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <select
                value={slide.mode}
                onChange={(e) =>
                  onUpdateBp((prev) => ({
                    ...prev,
                    sections: {
                      ...prev.sections,
                      heroSlides: prev.sections.heroSlides.map((s, i) =>
                        i === idx ? { ...s, mode: e.target.value as "artwork" | "editorial" } : s
                      ),
                    },
                  }))
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-800"
              >
                <option value="artwork">Arte Original (sem texto sobreposto)</option>
                <option value="editorial">Editorial (título + subtítulo + botão CTA)</option>
              </select>

              <AiImageSlot
                previewId={previewId}
                label={`Imagem do Slide ${idx + 1}`}
                value={slide.imageUrl}
                defaultAspectRatio="16:9"
                minRecommendedWidth={1000}
                onChange={(nextUrl) =>
                  onUpdateBp((prev) => ({
                    ...prev,
                    sections: {
                      ...prev.sections,
                      hero: idx === 0 ? { ...prev.sections.hero, imageUrl: nextUrl } : prev.sections.hero,
                      heroSlides: prev.sections.heroSlides.map((s, i) =>
                        i === idx ? { ...s, imageUrl: nextUrl } : s
                      ),
                    },
                  }))
                }
              />

              {slide.mode === "editorial" && (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={slide.headline}
                    placeholder="Título do Banner"
                    onChange={(e) =>
                      onUpdateBp((prev) => ({
                        ...prev,
                        sections: {
                          ...prev.sections,
                          heroSlides: prev.sections.heroSlides.map((s, i) =>
                            i === idx ? { ...s, headline: e.target.value } : s
                          ),
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-800"
                  />
                  <input
                    type="text"
                    value={slide.subheadline}
                    placeholder="Subtítulo"
                    onChange={(e) =>
                      onUpdateBp((prev) => ({
                        ...prev,
                        sections: {
                          ...prev.sections,
                          heroSlides: prev.sections.heroSlides.map((s, i) =>
                            i === idx ? { ...s, subheadline: e.target.value } : s
                          ),
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-800"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={slide.ctaText}
                      placeholder="Texto do Botão"
                      onChange={(e) =>
                        onUpdateBp((prev) => ({
                          ...prev,
                          sections: {
                            ...prev.sections,
                            heroSlides: prev.sections.heroSlides.map((s, i) =>
                              i === idx ? { ...s, ctaText: e.target.value } : s
                            ),
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-800"
                    />
                    <input
                      type="text"
                      value={slide.ctaHref}
                      placeholder="Link (#vitrines)"
                      onChange={(e) =>
                        onUpdateBp((prev) => ({
                          ...prev,
                          sections: {
                            ...prev.sections,
                            heroSlides: prev.sections.heroSlides.map((s, i) =>
                              i === idx ? { ...s, ctaHref: e.target.value } : s
                            ),
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 6. TARJA INFORMATIVA (BENEFÍCIOS) */}
      {selection.targetId === "tarja" && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800">Formato da Tarja</span>
            <button
              type="button"
              onClick={onDownloadBenefitsPng}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-500"
            >
              <Download className="h-3 w-3" />
              Baixar PNG
            </button>
          </div>

          <select
            value={bp.sections.benefitsBanner?.mode ?? "generated-art"}
            onChange={(e) =>
              onUpdateBp((prev) => ({
                ...prev,
                sections: {
                  ...prev.sections,
                  benefitsBanner: {
                    backgroundColor:
                      prev.sections.benefitsBanner?.backgroundColor ?? prev.theme.neutralBackground,
                    textColor:
                      prev.sections.benefitsBanner?.textColor ?? prev.theme.neutralForeground,
                    siteImageUrls: prev.sections.benefitsBanner?.siteImageUrls ?? [],
                    ...prev.sections.benefitsBanner,
                    mode: e.target.value as
                      | "site-images"
                      | "custom-image"
                      | "generated-art"
                      | "cards",
                  },
                },
              }))
            }
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-800"
          >
            {(bp.sections.benefitsBanner?.siteImageUrls?.length ?? 0) > 0 && (
              <option value="site-images">Artes Extraídas / Enviadas (Múltiplas)</option>
            )}
            <option value="custom-image">Imagem Única do Computador / IA</option>
            <option value="generated-art">Arte Banner Gerada (Irroba)</option>
            <option value="cards">Cards Modulares Editáveis</option>
          </select>

          {bp.sections.benefitsBanner?.mode === "custom-image" && (
            <AiImageSlot
              previewId={previewId}
              label="Imagem da Tarja (Envie do computador ou gere com IA)"
              value={bp.sections.benefitsBanner?.customImageUrl ?? ""}
              defaultAspectRatio="21:9"
              minRecommendedWidth={900}
              onChange={(nextUrl) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  sections: {
                    ...prev.sections,
                    benefitsBanner: {
                      mode: "custom-image",
                      backgroundColor:
                        prev.sections.benefitsBanner?.backgroundColor ??
                        prev.theme.neutralBackground,
                      textColor:
                        prev.sections.benefitsBanner?.textColor ?? prev.theme.neutralForeground,
                      siteImageUrls: prev.sections.benefitsBanner?.siteImageUrls ?? [],
                      ...prev.sections.benefitsBanner,
                      customImageUrl: nextUrl,
                    },
                  },
                }))
              }
            />
          )}

          {bp.sections.benefitsBanner?.mode === "site-images" && (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Imagens dos Benefícios</span>
                {(bp.sections.benefitsBanner.siteImageUrls?.length ?? 0) < 6 && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateBp((prev) => ({
                        ...prev,
                        sections: {
                          ...prev.sections,
                          benefitsBanner: {
                            ...prev.sections.benefitsBanner!,
                            siteImageUrls: [
                              ...(prev.sections.benefitsBanner?.siteImageUrls ?? []),
                              "",
                            ],
                          },
                        },
                      }))
                    }
                    className="inline-flex items-center gap-1 rounded bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white"
                  >
                    <Plus className="h-3 w-3" /> Item
                  </button>
                )}
              </div>
              {bp.sections.benefitsBanner.siteImageUrls.map((url, idx) => (
                <AiImageSlot
                  key={idx}
                  previewId={previewId}
                  label={`Arte Benefício ${idx + 1}`}
                  value={url}
                  defaultAspectRatio="1:1"
                  minRecommendedWidth={0}
                  fit="contain"
                  allowAi={false}
                  allowClear
                  onChange={(nextUrl) =>
                    onUpdateBp((prev) => {
                      const prevUrls = prev.sections.benefitsBanner?.siteImageUrls ?? [];
                      const nextUrls = nextUrl
                        ? prevUrls.map((u, i) => (i === idx ? nextUrl : u))
                        : prevUrls.filter((_, i) => i !== idx);
                      return {
                        ...prev,
                        sections: {
                          ...prev.sections,
                          benefitsBanner: {
                            ...prev.sections.benefitsBanner!,
                            siteImageUrls: nextUrls,
                          },
                        },
                      };
                    })
                  }
                />
              ))}
            </div>
          )}

          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
            <div className="flex items-center justify-between font-semibold text-slate-700">
              <span>Dimensionamento</span>
              <label className="flex items-center gap-1 font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={Boolean(bp.sections.benefitsBanner?.fullWidth)}
                  onChange={(e) =>
                    onUpdateBp((prev) => ({
                      ...prev,
                      sections: {
                        ...prev.sections,
                        benefitsBanner: {
                          mode: prev.sections.benefitsBanner?.mode ?? "generated-art",
                          backgroundColor:
                            prev.sections.benefitsBanner?.backgroundColor ??
                            prev.theme.neutralBackground,
                          textColor:
                            prev.sections.benefitsBanner?.textColor ?? prev.theme.neutralForeground,
                          siteImageUrls: prev.sections.benefitsBanner?.siteImageUrls ?? [],
                          ...prev.sections.benefitsBanner,
                          fullWidth: e.target.checked,
                        },
                      },
                    }))
                  }
                />
                Largura 100%
              </label>
            </div>
            <div>
              <div className="mb-0.5 flex justify-between text-slate-600">
                <span>Altura máxima</span>
                <strong className="font-mono text-slate-800">
                  {bp.sections.benefitsBanner?.maxHeightPx ?? 120}px
                </strong>
              </div>
              <input
                type="range"
                min={36}
                max={260}
                step={4}
                value={bp.sections.benefitsBanner?.maxHeightPx ?? 120}
                onChange={(e) =>
                  onUpdateBp((prev) => ({
                    ...prev,
                    sections: {
                      ...prev.sections,
                      benefitsBanner: {
                        mode: prev.sections.benefitsBanner?.mode ?? "generated-art",
                        backgroundColor:
                          prev.sections.benefitsBanner?.backgroundColor ??
                          prev.theme.neutralBackground,
                        textColor:
                          prev.sections.benefitsBanner?.textColor ?? prev.theme.neutralForeground,
                        siteImageUrls: prev.sections.benefitsBanner?.siteImageUrls ?? [],
                        ...prev.sections.benefitsBanner,
                        maxHeightPx: Number(e.target.value),
                      },
                    },
                  }))
                }
                className="w-full accent-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ColorField
              label="Fundo da Faixa"
              value={bp.sections.benefitsBanner?.backgroundColor ?? bp.theme.neutralBackground}
              onChange={(v) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  sections: {
                    ...prev.sections,
                    benefitsBanner: {
                      mode: prev.sections.benefitsBanner?.mode ?? "generated-art",
                      textColor:
                        prev.sections.benefitsBanner?.textColor ?? prev.theme.neutralForeground,
                      siteImageUrls: prev.sections.benefitsBanner?.siteImageUrls ?? [],
                      ...prev.sections.benefitsBanner,
                      backgroundColor: v,
                    },
                  },
                }))
              }
            />
            <ColorField
              label="Texto da Arte"
              value={bp.sections.benefitsBanner?.textColor ?? bp.theme.neutralForeground}
              onChange={(v) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  sections: {
                    ...prev.sections,
                    benefitsBanner: {
                      mode: prev.sections.benefitsBanner?.mode ?? "generated-art",
                      backgroundColor:
                        prev.sections.benefitsBanner?.backgroundColor ??
                        prev.theme.neutralBackground,
                      siteImageUrls: prev.sections.benefitsBanner?.siteImageUrls ?? [],
                      ...prev.sections.benefitsBanner,
                      textColor: v,
                    },
                  },
                }))
              }
            />
          </div>

          {bp.sections.benefitsBanner?.mode !== "site-images" &&
            bp.sections.benefitsBanner?.mode !== "custom-image" && (
              <div className="space-y-1.5 pt-1">
                <div className="font-semibold text-slate-700">Textos dos Benefícios</div>
                {bp.sections.benefits.slice(0, 4).map((b, bIdx) => (
                  <div key={bIdx} className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={b.title}
                      onChange={(e) =>
                        onUpdateBp((prev) => ({
                          ...prev,
                          sections: {
                            ...prev.sections,
                            benefits: prev.sections.benefits.map((item, idx) =>
                              idx === bIdx ? { ...item, title: e.target.value } : item
                            ),
                          },
                        }))
                      }
                      className="rounded border border-slate-200 px-2 py-1"
                    />
                    <input
                      type="text"
                      value={b.subtitle}
                      onChange={(e) =>
                        onUpdateBp((prev) => ({
                          ...prev,
                          sections: {
                            ...prev.sections,
                            benefits: prev.sections.benefits.map((item, idx) =>
                              idx === bIdx ? { ...item, subtitle: e.target.value } : item
                            ),
                          },
                        }))
                      }
                      className="rounded border border-slate-200 px-2 py-1"
                    />
                  </div>
                ))}
              </div>
            )}
        </div>
      )}

      {/* 7. GALERIA EDITORIAL (MOOD BANNERS 3:4) */}
      {selection.targetId === "editorialGallery" && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
          <div>
            <label className="mb-1 block font-semibold text-slate-700">Título da Seção</label>
            <input
              type="text"
              value={bp.sections.moodSectionTitle}
              onChange={(e) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  sections: { ...prev.sections, moodSectionTitle: e.target.value },
                }))
              }
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
            />
          </div>

          <BannerDimensionsControl
            title="Tamanho dos Cards da Galeria (PX)"
            heightPx={bp.sections.moodCardHeightPx}
            defaultHeightPx={380}
            minHeightPx={180}
            maxHeightPx={850}
            onHeightChange={(h) =>
              onUpdateBp((prev) => ({
                ...prev,
                sections: { ...prev.sections, moodCardHeightPx: h },
              }))
            }
          />

          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">Cards da Galeria (até 4 ativos)</span>
            {bp.sections.moodBanners.length < 4 && (
              <button
                type="button"
                onClick={() =>
                  onUpdateBp((prev) => ({
                    ...prev,
                    sections: {
                      ...prev.sections,
                      moodBanners: [
                        ...prev.sections.moodBanners,
                        {
                          id: `mood-${Date.now()}`,
                          title: `Coleção ${prev.sections.moodBanners.length + 1}`,
                          subtitle: "Curadoria Exclusiva",
                          imageUrl: prev.products[0]?.imageUrl || prev.sections.hero.imageUrl,
                          href: "#vitrines",
                          enabled: true,
                        },
                      ],
                    },
                  }))
                }
                className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white"
              >
                <Plus className="h-3 w-3" /> Card
              </button>
            )}
          </div>

          {bp.sections.moodBanners.map((m, idx) => (
            <div
              key={m.id}
              className={`space-y-1.5 rounded-lg border p-2.5 ${
                selection.subIndex === idx
                  ? "border-emerald-400 bg-emerald-50/40"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <label className="flex items-center justify-between font-semibold text-slate-700">
                <span>Card {idx + 1}</span>
                <input
                  type="checkbox"
                  checked={m.enabled}
                  onChange={(e) =>
                    onUpdateBp((prev) => ({
                      ...prev,
                      sections: {
                        ...prev.sections,
                        moodBanners: prev.sections.moodBanners.map((item, i) =>
                          i === idx ? { ...item, enabled: e.target.checked } : item
                        ),
                      },
                    }))
                  }
                />
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={m.title}
                  placeholder="Título da coleção"
                  onChange={(e) =>
                    onUpdateBp((prev) => ({
                      ...prev,
                      sections: {
                        ...prev.sections,
                        moodBanners: prev.sections.moodBanners.map((item, i) =>
                          i === idx ? { ...item, title: e.target.value } : item
                        ),
                      },
                    }))
                  }
                  className="rounded border border-slate-200 bg-white px-2 py-1"
                />
                <input
                  type="text"
                  value={m.subtitle}
                  placeholder="Selo (ex: Curadoria)"
                  onChange={(e) =>
                    onUpdateBp((prev) => ({
                      ...prev,
                      sections: {
                        ...prev.sections,
                        moodBanners: prev.sections.moodBanners.map((item, i) =>
                          i === idx ? { ...item, subtitle: e.target.value } : item
                        ),
                      },
                    }))
                  }
                  className="rounded border border-slate-200 bg-white px-2 py-1"
                />
              </div>
              <AiImageSlot
                previewId={previewId}
                label={`Foto do Card ${idx + 1} (3:4)`}
                value={m.imageUrl}
                defaultAspectRatio="3:4"
                minRecommendedWidth={500}
                onChange={(nextUrl) =>
                  onUpdateBp((prev) => ({
                    ...prev,
                    sections: {
                      ...prev.sections,
                      moodBanners: prev.sections.moodBanners.map((item, i) =>
                        i === idx ? { ...item, imageUrl: nextUrl } : item
                      ),
                    },
                  }))
                }
              />
            </div>
          ))}
        </div>
      )}

      {/* 8. BANNER SLIM PROMOCIONAL */}
      {selection.targetId === "slimBanner" && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
          <BannerDimensionsControl
            title="Tamanho do Banner Slim (PX)"
            heightPx={bp.sections.slimBanner?.heightPx}
            defaultHeightPx={140}
            minHeightPx={48}
            maxHeightPx={500}
            widthPx={bp.sections.slimBanner?.widthPx}
            defaultWidthPx={1280}
            objectFit={bp.sections.slimBanner?.objectFit}
            onHeightChange={(h) =>
              onUpdateBp((prev) => ({
                ...prev,
                sections: {
                  ...prev.sections,
                  slimBanner: prev.sections.slimBanner
                    ? { ...prev.sections.slimBanner, heightPx: h }
                    : undefined,
                },
              }))
            }
            onWidthChange={(w) =>
              onUpdateBp((prev) => ({
                ...prev,
                sections: {
                  ...prev.sections,
                  slimBanner: prev.sections.slimBanner
                    ? { ...prev.sections.slimBanner, widthPx: w }
                    : undefined,
                },
              }))
            }
            onObjectFitChange={
              bp.sections.slimBanner?.mode === "image"
                ? (fit) =>
                    onUpdateBp((prev) => ({
                      ...prev,
                      sections: {
                        ...prev.sections,
                        slimBanner: prev.sections.slimBanner
                          ? { ...prev.sections.slimBanner, objectFit: fit }
                          : undefined,
                      },
                    }))
                : undefined
            }
          />

          <div>
            <label className="mb-1 block font-semibold text-slate-700">Modo da Faixa</label>
            <select
              value={bp.sections.slimBanner?.mode ?? "designed"}
              onChange={(e) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  sections: {
                    ...prev.sections,
                    slimBanner: {
                      enabled: prev.sections.slimBanner?.enabled ?? true,
                      imageUrl: prev.sections.slimBanner?.imageUrl ?? "",
                      badgeText: prev.sections.slimBanner?.badgeText ?? "OFERTA",
                      headline:
                        prev.sections.slimBanner?.headline ??
                        "Ganhe 5% OFF no PIX e parcelamento sem juros",
                      ctaText: prev.sections.slimBanner?.ctaText ?? "Aproveitar",
                      backgroundColor:
                        prev.sections.slimBanner?.backgroundColor ?? prev.theme.secondaryBackground,
                      textColor:
                        prev.sections.slimBanner?.textColor ?? prev.theme.secondaryForeground,
                      ...prev.sections.slimBanner,
                      mode: e.target.value as "image" | "designed",
                    },
                  },
                }))
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-800"
            >
              <option value="designed">Faixa Desenhada (Texto + Selo + Botão)</option>
              <option value="image">Imagem Banner Slim (Upload / IA)</option>
            </select>
          </div>

          {bp.sections.slimBanner?.mode === "image" ? (
            <AiImageSlot
              previewId={previewId}
              label="Arte Banner Slim (21:9)"
              value={bp.sections.slimBanner.imageUrl}
              defaultAspectRatio="21:9"
              minRecommendedWidth={1000}
              onChange={(nextUrl) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  sections: {
                    ...prev.sections,
                    slimBanner: prev.sections.slimBanner
                      ? { ...prev.sections.slimBanner, imageUrl: nextUrl }
                      : undefined,
                  },
                }))
              }
            />
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-slate-500">Selo</label>
                  <input
                    type="text"
                    value={bp.sections.slimBanner?.badgeText ?? "DESTAQUE"}
                    onChange={(e) =>
                      onUpdateBp((prev) => ({
                        ...prev,
                        sections: {
                          ...prev.sections,
                          slimBanner: prev.sections.slimBanner
                            ? { ...prev.sections.slimBanner, badgeText: e.target.value }
                            : undefined,
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-2 py-1"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-slate-500">Texto do Botão</label>
                  <input
                    type="text"
                    value={bp.sections.slimBanner?.ctaText ?? "Aproveitar"}
                    onChange={(e) =>
                      onUpdateBp((prev) => ({
                        ...prev,
                        sections: {
                          ...prev.sections,
                          slimBanner: prev.sections.slimBanner
                            ? { ...prev.sections.slimBanner, ctaText: e.target.value }
                            : undefined,
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-2 py-1"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-slate-500">Mensagem Promocional</label>
                <input
                  type="text"
                  value={bp.sections.slimBanner?.headline ?? ""}
                  onChange={(e) =>
                    onUpdateBp((prev) => ({
                      ...prev,
                      sections: {
                        ...prev.sections,
                        slimBanner: prev.sections.slimBanner
                          ? { ...prev.sections.slimBanner, headline: e.target.value }
                          : undefined,
                      },
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <ColorField
                  label="Fundo"
                  value={bp.sections.slimBanner?.backgroundColor ?? "#111827"}
                  onChange={(v) =>
                    onUpdateBp((prev) => ({
                      ...prev,
                      sections: {
                        ...prev.sections,
                        slimBanner: prev.sections.slimBanner
                          ? { ...prev.sections.slimBanner, backgroundColor: v }
                          : undefined,
                      },
                    }))
                  }
                />
                <ColorField
                  label="Texto"
                  value={bp.sections.slimBanner?.textColor ?? "#FFFFFF"}
                  contrastWith={bp.sections.slimBanner?.backgroundColor ?? "#111827"}
                  onChange={(v) =>
                    onUpdateBp((prev) => ({
                      ...prev,
                      sections: {
                        ...prev.sections,
                        slimBanner: prev.sections.slimBanner
                          ? { ...prev.sections.slimBanner, textColor: v }
                          : undefined,
                      },
                    }))
                  }
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 9. CARD DE PRODUTO INDIVIDUAL */}
      {selection.targetId === "product-item" && selectedProduct && (
        <div className="space-y-3">
          <div className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">Dados deste Produto</span>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
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
              <label className="mb-1 block text-slate-500">Nome do Produto</label>
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
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-slate-500">Preço Atual (R$)</label>
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
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-slate-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-slate-500">Preço Antigo &quot;De&quot; (R$)</label>
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
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-slate-500">Categoria</label>
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
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-slate-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-slate-500">Parcelamento</label>
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
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-slate-900"
                />
              </div>
            </div>
          </div>

          {renderCardAndBuyButtonControls()}
        </div>
      )}

      {/* 10. BOTÃO COMPRAR */}
      {selection.targetId === "buy-button" && renderCardAndBuyButtonControls()}

      {/* 11. VITRINE PRINCIPAL & VITRINES ADICIONAIS */}
      {(selection.targetId === "showcase1" || selection.targetId === "extraShowcases") && (
        <div className="space-y-3">
          <div className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">Títulos das Vitrines</span>
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
                className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white"
              >
                <Plus className="h-3 w-3" /> Vitrine
              </button>
            </div>

            {bp.sections.showcases.map((sc, idx) => (
              <div
                key={idx}
                className={`space-y-1.5 rounded-lg border p-2 ${
                  idx === activeShowcaseIdx
                    ? "border-emerald-400 bg-emerald-50/40"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Vitrine {idx + 1}</span>
                  {bp.sections.showcases.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateBp((prev) => ({
                          ...prev,
                          sections: {
                            ...prev.sections,
                            showcases: prev.sections.showcases.filter((_, i) => i !== idx),
                          },
                        }))
                      }
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <input
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
                  className="w-full rounded border border-slate-200 bg-white px-2 py-1 font-medium text-slate-900"
                />
                <input
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
                  className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-slate-700"
                />
              </div>
            ))}
          </div>

          {renderCardAndBuyButtonControls()}

          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">
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
                className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-500"
              >
                <Plus className="h-3 w-3" /> Produto
              </button>
            </div>

            <div className="max-h-56 space-y-1.5 overflow-y-auto">
              {bp.products.map((prod) => (
                <div
                  key={prod.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5"
                >
                  <input
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
                  <span className="flex-1 truncate text-slate-700">{prod.title}</span>
                  <button
                    type="button"
                    onClick={() =>
                      onSelect({
                        targetId: "product-item",
                        productId: prod.id,
                        label: `Produto: ${prod.title.slice(0, 26)}`,
                      })
                    }
                    className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    <Pencil className="h-2.5 w-2.5" />
                    Editar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 12. BANNER SECUNDÁRIO DE CAMPANHA */}
      {selection.targetId === "secondaryBanner" && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
          <BannerDimensionsControl
            title="Tamanho do Banner Secundário (PX)"
            heightPx={bp.sections.secondaryBanner?.heightPx}
            defaultHeightPx={420}
            minHeightPx={140}
            maxHeightPx={900}
            widthPx={bp.sections.secondaryBanner?.widthPx}
            defaultWidthPx={1280}
            objectFit={bp.sections.secondaryBanner?.objectFit}
            onHeightChange={(h) =>
              onUpdateBp((prev) => ({
                ...prev,
                sections: {
                  ...prev.sections,
                  secondaryBanner: prev.sections.secondaryBanner
                    ? { ...prev.sections.secondaryBanner, heightPx: h }
                    : undefined,
                },
              }))
            }
            onWidthChange={(w) =>
              onUpdateBp((prev) => ({
                ...prev,
                sections: {
                  ...prev.sections,
                  secondaryBanner: prev.sections.secondaryBanner
                    ? { ...prev.sections.secondaryBanner, widthPx: w }
                    : undefined,
                },
              }))
            }
            onObjectFitChange={(fit) =>
              onUpdateBp((prev) => ({
                ...prev,
                sections: {
                  ...prev.sections,
                  secondaryBanner: prev.sections.secondaryBanner
                    ? { ...prev.sections.secondaryBanner, objectFit: fit }
                    : undefined,
                },
              }))
            }
          />

          <div>
            <label className="mb-1 block font-semibold text-slate-700">Modo do Banner</label>
            <select
              value={bp.sections.secondaryBanner?.mode ?? "editorial"}
              onChange={(e) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  sections: {
                    ...prev.sections,
                    secondaryBanner: {
                      enabled: prev.sections.secondaryBanner?.enabled ?? true,
                      imageUrl: prev.sections.secondaryBanner?.imageUrl ?? prev.sections.hero.imageUrl,
                      headline:
                        prev.sections.secondaryBanner?.headline ??
                        "Descubra os mais desejados da coleção",
                      subheadline:
                        prev.sections.secondaryBanner?.subheadline ??
                        "Qualidade, conforto e design selecionados para você.",
                      ctaText: prev.sections.secondaryBanner?.ctaText ?? "Explorar Coleção",
                      backgroundColor:
                        prev.sections.secondaryBanner?.backgroundColor ??
                        prev.theme.secondaryBackground,
                      textColor:
                        prev.sections.secondaryBanner?.textColor ?? prev.theme.secondaryForeground,
                      ...prev.sections.secondaryBanner,
                      mode: e.target.value as "artwork" | "editorial",
                    },
                  },
                }))
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-800"
            >
              <option value="artwork">Arte Completa (Imagem Larga)</option>
              <option value="editorial">Editorial (Imagem + Texto + Botão)</option>
            </select>
          </div>

          <AiImageSlot
            previewId={previewId}
            label="Imagem do Banner Secundário"
            value={bp.sections.secondaryBanner?.imageUrl ?? ""}
            defaultAspectRatio="16:9"
            minRecommendedWidth={900}
            onChange={(nextUrl) =>
              onUpdateBp((prev) => ({
                ...prev,
                sections: {
                  ...prev.sections,
                  secondaryBanner: {
                    enabled: true,
                    mode: prev.sections.secondaryBanner?.mode ?? "editorial",
                    headline:
                      prev.sections.secondaryBanner?.headline ??
                      "Descubra os mais desejados da coleção",
                    subheadline:
                      prev.sections.secondaryBanner?.subheadline ??
                      "Qualidade, conforto e design selecionados para você.",
                    ctaText: prev.sections.secondaryBanner?.ctaText ?? "Explorar Coleção",
                    backgroundColor:
                      prev.sections.secondaryBanner?.backgroundColor ??
                      prev.theme.secondaryBackground,
                    textColor:
                      prev.sections.secondaryBanner?.textColor ?? prev.theme.secondaryForeground,
                    ...prev.sections.secondaryBanner,
                    imageUrl: nextUrl,
                  },
                },
              }))
            }
          />

          {(bp.sections.secondaryBanner?.mode ?? "editorial") === "editorial" && (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Título da campanha"
                value={bp.sections.secondaryBanner?.headline ?? ""}
                onChange={(e) =>
                  onUpdateBp((prev) => ({
                    ...prev,
                    sections: {
                      ...prev.sections,
                      secondaryBanner: prev.sections.secondaryBanner
                        ? { ...prev.sections.secondaryBanner, headline: e.target.value }
                        : undefined,
                    },
                  }))
                }
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
              />
              <textarea
                rows={2}
                placeholder="Subtítulo da campanha"
                value={bp.sections.secondaryBanner?.subheadline ?? ""}
                onChange={(e) =>
                  onUpdateBp((prev) => ({
                    ...prev,
                    sections: {
                      ...prev.sections,
                      secondaryBanner: prev.sections.secondaryBanner
                        ? { ...prev.sections.secondaryBanner, subheadline: e.target.value }
                        : undefined,
                    },
                  }))
                }
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
              />
              <input
                type="text"
                placeholder="Texto do botão"
                value={bp.sections.secondaryBanner?.ctaText ?? ""}
                onChange={(e) =>
                  onUpdateBp((prev) => ({
                    ...prev,
                    sections: {
                      ...prev.sections,
                      secondaryBanner: prev.sections.secondaryBanner
                        ? { ...prev.sections.secondaryBanner, ctaText: e.target.value }
                        : undefined,
                    },
                  }))
                }
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
              />
              <div className="grid grid-cols-2 gap-2">
                <ColorField
                  label="Fundo do Bloco"
                  value={bp.sections.secondaryBanner?.backgroundColor ?? bp.theme.secondaryBackground}
                  onChange={(v) =>
                    onUpdateBp((prev) => ({
                      ...prev,
                      sections: {
                        ...prev.sections,
                        secondaryBanner: prev.sections.secondaryBanner
                          ? { ...prev.sections.secondaryBanner, backgroundColor: v }
                          : undefined,
                      },
                    }))
                  }
                />
                <ColorField
                  label="Cor do Texto"
                  value={bp.sections.secondaryBanner?.textColor ?? bp.theme.secondaryForeground}
                  contrastWith={
                    bp.sections.secondaryBanner?.backgroundColor ?? bp.theme.secondaryBackground
                  }
                  onChange={(v) =>
                    onUpdateBp((prev) => ({
                      ...prev,
                      sections: {
                        ...prev.sections,
                        secondaryBanner: prev.sections.secondaryBanner
                          ? { ...prev.sections.secondaryBanner, textColor: v }
                          : undefined,
                      },
                    }))
                  }
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 13. LOOKBOOK & MANIFESTO */}
      {selection.targetId === "editorialLookbook" && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-slate-500">Etiqueta Superior</label>
              <input
                type="text"
                value={bp.sections.lookbook?.eyebrow ?? "01 / Manifesto"}
                onChange={(e) =>
                  onUpdateBp((prev) => ({
                    ...prev,
                    sections: {
                      ...prev.sections,
                      lookbook: {
                        mainImageUrl: prev.sections.lookbook?.mainImageUrl ?? "",
                        insetImageUrl: prev.sections.lookbook?.insetImageUrl ?? "",
                        ...prev.sections.lookbook,
                        eyebrow: e.target.value,
                      },
                    },
                  }))
                }
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5"
              />
            </div>
            <div>
              <label className="mb-1 block text-slate-500">Texto do Botão</label>
              <input
                type="text"
                value={bp.sections.lookbook?.ctaText ?? bp.sections.hero.ctaText}
                onChange={(e) =>
                  onUpdateBp((prev) => ({
                    ...prev,
                    sections: {
                      ...prev.sections,
                      lookbook: {
                        eyebrow: prev.sections.lookbook?.eyebrow ?? "01 / Manifesto",
                        mainImageUrl: prev.sections.lookbook?.mainImageUrl ?? "",
                        insetImageUrl: prev.sections.lookbook?.insetImageUrl ?? "",
                        ...prev.sections.lookbook,
                        ctaText: e.target.value,
                      },
                    },
                  }))
                }
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-slate-500">Título do Manifesto</label>
            <input
              type="text"
              value={bp.sections.lookbook?.headline ?? bp.sections.promoStripText}
              onChange={(e) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  sections: {
                    ...prev.sections,
                    lookbook: {
                      eyebrow: prev.sections.lookbook?.eyebrow ?? "01 / Manifesto",
                      mainImageUrl: prev.sections.lookbook?.mainImageUrl ?? "",
                      insetImageUrl: prev.sections.lookbook?.insetImageUrl ?? "",
                      ...prev.sections.lookbook,
                      headline: e.target.value,
                    },
                  },
                }))
              }
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
            />
          </div>

          <div>
            <label className="mb-1 block text-slate-500">Narrativa da Marca</label>
            <textarea
              rows={3}
              value={bp.sections.lookbook?.description ?? bp.footer.aboutText}
              onChange={(e) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  sections: {
                    ...prev.sections,
                    lookbook: {
                      eyebrow: prev.sections.lookbook?.eyebrow ?? "01 / Manifesto",
                      mainImageUrl: prev.sections.lookbook?.mainImageUrl ?? "",
                      insetImageUrl: prev.sections.lookbook?.insetImageUrl ?? "",
                      ...prev.sections.lookbook,
                      description: e.target.value,
                    },
                  },
                }))
              }
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
            />
          </div>

          <AiImageSlot
            previewId={previewId}
            label="Foto Principal do Lookbook (16:9)"
            value={
              bp.sections.lookbook?.mainImageUrl ||
              bp.sections.secondaryBanner?.imageUrl ||
              bp.sections.hero.imageUrl
            }
            defaultAspectRatio="16:9"
            minRecommendedWidth={800}
            onChange={(nextUrl) =>
              onUpdateBp((prev) => ({
                ...prev,
                sections: {
                  ...prev.sections,
                  lookbook: {
                    eyebrow: prev.sections.lookbook?.eyebrow ?? "01 / Manifesto",
                    insetImageUrl: prev.sections.lookbook?.insetImageUrl ?? "",
                    ...prev.sections.lookbook,
                    mainImageUrl: nextUrl,
                  },
                },
              }))
            }
          />

          <AiImageSlot
            previewId={previewId}
            label="Foto Detalhe Sobreposta (1:1)"
            value={
              bp.sections.lookbook?.insetImageUrl ||
              bp.products[1]?.imageUrl ||
              bp.products[0]?.imageUrl ||
              ""
            }
            defaultAspectRatio="1:1"
            minRecommendedWidth={500}
            onChange={(nextUrl) =>
              onUpdateBp((prev) => ({
                ...prev,
                sections: {
                  ...prev.sections,
                  lookbook: {
                    eyebrow: prev.sections.lookbook?.eyebrow ?? "01 / Manifesto",
                    mainImageUrl: prev.sections.lookbook?.mainImageUrl ?? "",
                    ...prev.sections.lookbook,
                    insetImageUrl: nextUrl,
                  },
                },
              }))
            }
          />
        </div>
      )}

      {/* 14. AVALIAÇÕES DE CLIENTES */}
      {selection.targetId === "testimonials" && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
          <div>
            <label className="mb-1 block font-semibold text-slate-700">Título da Seção</label>
            <input
              type="text"
              value={bp.sections.testimonialsTitle}
              onChange={(e) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  sections: { ...prev.sections, testimonialsTitle: e.target.value },
                }))
              }
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">Depoimentos Exibidos</span>
            <button
              type="button"
              onClick={() =>
                onUpdateBp((prev) => ({
                  ...prev,
                  sections: {
                    ...prev.sections,
                    testimonialsIllustrative: false,
                    testimonials: [
                      ...prev.sections.testimonials,
                      {
                        author: "Cliente Verificado",
                        rating: 5,
                        comment: "Atendimento impecável e entrega super rápida!",
                      },
                    ],
                  },
                }))
              }
              className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white"
            >
              <Plus className="h-3 w-3" /> Avaliação
            </button>
          </div>

          {bp.sections.testimonials.map((rev, idx) => (
            <div
              key={idx}
              className={`space-y-1.5 rounded-lg border p-2.5 ${
                selection.subIndex === idx
                  ? "border-emerald-400 bg-emerald-50/40"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={rev.author}
                  placeholder="Nome do cliente"
                  onChange={(e) =>
                    onUpdateBp((prev) => ({
                      ...prev,
                      sections: {
                        ...prev.sections,
                        testimonials: prev.sections.testimonials.map((t, i) =>
                          i === idx ? { ...t, author: e.target.value } : t
                        ),
                      },
                    }))
                  }
                  className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-800"
                />
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() =>
                        onUpdateBp((prev) => ({
                          ...prev,
                          sections: {
                            ...prev.sections,
                            testimonials: prev.sections.testimonials.map((t, i) =>
                              i === idx ? { ...t, rating: star } : t
                            ),
                          },
                        }))
                      }
                      className="p-0.5"
                      title={`${star} estrela(s)`}
                    >
                      <Star
                        className={`h-3.5 w-3.5 ${
                          star <= rev.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {bp.sections.testimonials.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateBp((prev) => ({
                        ...prev,
                        sections: {
                          ...prev.sections,
                          testimonials: prev.sections.testimonials.filter((_, i) => i !== idx),
                        },
                      }))
                    }
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <textarea
                rows={2}
                value={rev.comment}
                onChange={(e) =>
                  onUpdateBp((prev) => ({
                    ...prev,
                    sections: {
                      ...prev.sections,
                      testimonials: prev.sections.testimonials.map((t, i) =>
                        i === idx ? { ...t, comment: e.target.value } : t
                      ),
                    },
                  }))
                }
                className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-slate-700"
              />
            </div>
          ))}
        </div>
      )}

      {/* 15. NEWSLETTER */}
      {selection.targetId === "newsletter" && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
          <div>
            <label className="mb-1 block text-slate-500">Título da Newsletter</label>
            <input
              type="text"
              value={bp.sections.newsletter?.headline ?? `Receba novidades da ${bp.brand.name}`}
              onChange={(e) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  sections: {
                    ...prev.sections,
                    newsletter: { ...prev.sections.newsletter, headline: e.target.value },
                  },
                }))
              }
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
            />
          </div>
          <div>
            <label className="mb-1 block text-slate-500">Subtítulo</label>
            <input
              type="text"
              value={
                bp.sections.newsletter?.subheadline ??
                "Cadastre seu e-mail para garantir ofertas exclusivas em primeira mão."
              }
              onChange={(e) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  sections: {
                    ...prev.sections,
                    newsletter: { ...prev.sections.newsletter, subheadline: e.target.value },
                  },
                }))
              }
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-slate-500">Placeholder do E-mail</label>
              <input
                type="text"
                value={bp.sections.newsletter?.placeholder ?? "Digite seu melhor e-mail"}
                onChange={(e) =>
                  onUpdateBp((prev) => ({
                    ...prev,
                    sections: {
                      ...prev.sections,
                      newsletter: { ...prev.sections.newsletter, placeholder: e.target.value },
                    },
                  }))
                }
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5"
              />
            </div>
            <div>
              <label className="mb-1 block text-slate-500">Texto do Botão</label>
              <input
                type="text"
                value={bp.sections.newsletter?.ctaText ?? "Cadastrar"}
                onChange={(e) =>
                  onUpdateBp((prev) => ({
                    ...prev,
                    sections: {
                      ...prev.sections,
                      newsletter: { ...prev.sections.newsletter, ctaText: e.target.value },
                    },
                  }))
                }
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <ColorField
              label="Fundo da Caixa"
              value={bp.theme.neutralBackground}
              onChange={(v) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  theme: { ...prev.theme, neutralBackground: v },
                }))
              }
            />
            <ColorField
              label="Texto da Caixa"
              value={bp.theme.neutralForeground}
              contrastWith={bp.theme.neutralBackground}
              onChange={(v) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  theme: { ...prev.theme, neutralForeground: v },
                }))
              }
            />
          </div>
        </div>
      )}

      {/* 16. RODAPÉ — INFORMAÇÕES & ATENDIMENTO */}
      {selection.targetId === "footer" && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
          <div>
            <label className="mb-1 block text-slate-500">Largura do Rodapé</label>
            <select
              value={bp.visualOverrides.footer.width}
              onChange={(e) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  visualOverrides: {
                    ...prev.visualOverrides,
                    footer: {
                      ...prev.visualOverrides.footer,
                      width: e.target.value as "container" | "full",
                    },
                  },
                }))
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-800"
            >
              <option value="container">Padrão do site (1280px)</option>
              <option value="full">Largura Total</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <ColorField
              label="Fundo do Rodapé"
              value={bp.visualOverrides.footer.background}
              onChange={(v) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  visualOverrides: {
                    ...prev.visualOverrides,
                    footer: { ...prev.visualOverrides.footer, background: v },
                  },
                }))
              }
            />
            <ColorField
              label="Texto do Rodapé"
              value={bp.visualOverrides.footer.foreground}
              contrastWith={bp.visualOverrides.footer.background}
              onChange={(v) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  visualOverrides: {
                    ...prev.visualOverrides,
                    footer: { ...prev.visualOverrides.footer, foreground: v },
                  },
                }))
              }
            />
          </div>

          <div>
            <label className="mb-1 block text-slate-500">Sobre a Loja</label>
            <textarea
              rows={3}
              value={bp.footer.aboutText}
              onChange={(e) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  footer: { ...prev.footer, aboutText: e.target.value },
                }))
              }
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
            />
          </div>

          <div className="space-y-2">
            <div>
              <label className="mb-1 block text-slate-500">WhatsApp de Atendimento</label>
              <input
                type="text"
                value={bp.footer.whatsapp ?? ""}
                placeholder="Ex: (11) 99999-9999"
                onChange={(e) =>
                  onUpdateBp((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, whatsapp: e.target.value },
                  }))
                }
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
              />
            </div>
            <div>
              <label className="mb-1 block text-slate-500">E-mail de Contato</label>
              <input
                type="email"
                value={bp.footer.email ?? ""}
                placeholder="contato@loja.com.br"
                onChange={(e) =>
                  onUpdateBp((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, email: e.target.value },
                  }))
                }
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
              />
            </div>
            <div>
              <label className="mb-1 block text-slate-500">URL do Instagram</label>
              <input
                type="text"
                value={bp.footer.instagram ?? ""}
                placeholder="https://instagram.com/sualoja"
                onChange={(e) =>
                  onUpdateBp((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, instagram: e.target.value },
                  }))
                }
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelect({ targetId: "footer-legal", label: "Rodapé — Faixa Legal" })}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Editar Faixa Legal / CNPJ →
          </button>
        </div>
      )}

      {/* 17. RODAPÉ — FAIXA LEGAL */}
      {selection.targetId === "footer-legal" && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
          <div>
            <label className="mb-1 block font-semibold text-slate-700">
              Texto de Direitos Autorais / CNPJ
            </label>
            <textarea
              rows={2}
              value={bp.footer.legalText ?? ""}
              placeholder={`© ${new Date().getFullYear()} ${bp.brand.name} — Todos os direitos reservados.`}
              onChange={(e) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  footer: { ...prev.footer, legalText: e.target.value },
                }))
              }
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <ColorField
              label="Fundo da Faixa Legal"
              value={bp.visualOverrides.footer.legalBackground}
              onChange={(v) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  visualOverrides: {
                    ...prev.visualOverrides,
                    footer: { ...prev.visualOverrides.footer, legalBackground: v },
                  },
                }))
              }
            />
            <ColorField
              label="Texto da Faixa Legal"
              value={bp.visualOverrides.footer.legalForeground}
              contrastWith={bp.visualOverrides.footer.legalBackground}
              onChange={(v) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  visualOverrides: {
                    ...prev.visualOverrides,
                    footer: { ...prev.visualOverrides.footer, legalForeground: v },
                  },
                }))
              }
            />
          </div>
        </div>
      )}

      {/* 18. PÁGINA DO PRODUTO (PDP) */}
      {selection.targetId === "pdp" && (
        <div className="space-y-3">
          <div className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-3">
            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                Orientação da Galeria de Fotos
              </label>
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
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-800"
              >
                <option value="vertical">Vertical (Miniaturas à esquerda)</option>
                <option value="horizontal">Horizontal (Miniaturas abaixo)</option>
              </select>
            </div>
          </div>

          {renderCardAndBuyButtonControls()}
        </div>
      )}
    </div>
  );
}
