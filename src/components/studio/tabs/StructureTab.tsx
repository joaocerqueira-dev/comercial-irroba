"use client";

import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { AiImageSlot } from "@/components/studio/AiImageSlot";
import { AnnouncementBarControls } from "@/components/studio/AnnouncementBarControls";
import { FONT_OPTIONS } from "@/components/studio/fontOptions";
import { Field } from "@/components/ui/Field";
import {
  CUSTOM_SECTION_MODULE_LABELS,
  CUSTOM_SECTION_TYPE_LABELS,
  CustomSectionKindSchema,
  isBuiltinSectionKey,
  type StoreBlueprint,
} from "@/lib/types/blueprint";
import type { StudioState } from "@/components/studio/useStudioState";
import { CategoryMenuPanel } from "./CategoryMenuPanel";

/** Aba Seções: topo/rodapé, ordem das seções, lookbook, aviso, categorias e vitrines. */
export function StructureTab({ studio }: { studio: StudioState }) {
  const {
    id,
    bp,
    dragSectionIdx,
    setDragSectionIdx,
    dragOverIdx,
    setDragOverIdx,
    dragSectionIdxRef,
    selectAndFocusElement,
    hoverSidebarTarget,
    sectionLayout,
    toSectionSelection,
    updateBp,
    moveSection,
    toggleSection,
    resetSectionLayout,
    addSectionOpen,
    setAddSectionOpen,
    addCustomSection,
    duplicateCustomSection,
    deleteCustomSection,
  } = studio;

  return (
    <div className="space-y-4">
      {/* 0. Árvore Fixa: Topo e Rodapé (Igual ao Editor de Tema Irroba) */}
      <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
        <div>
          <div className="font-bold text-zinc-900">Topo, Rodapé &amp; Páginas</div>
          <div className="text-xs text-zinc-500">
            Passe o cursor para destacar na prévia ou clique para editar cada área
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {(
            [
              { id: "announcement", label: "Barra de Aviso", sub: "#overlineEditor" },
              { id: "header", label: "Cabeçalho", sub: "#headerEditor" },
              { id: "header-logo", label: "Logotipo", sub: "Upload / Marca" },
              { id: "header-nav", label: "Menu Categorias", sub: "Navegação" },
              { id: "footer", label: "Rodapé Geral", sub: "#footerInformation" },
              { id: "footer-legal", label: "Faixa Legal", sub: "#footerLegalEditor" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onMouseEnter={() => hoverSidebarTarget(item.id)}
              onMouseLeave={() => hoverSidebarTarget(null)}
              onClick={() => selectAndFocusElement({ targetId: item.id, label: item.label }, true)}
              className="flex flex-col items-start rounded-xl border border-zinc-200 bg-white px-2.5 py-2 text-left transition hover:border-brand-300 hover:bg-brand-50/50"
            >
              <span className="font-semibold text-irroba-ink">{item.label}</span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                {item.sub}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 1. Manipulador de Seções da Página Inicial */}
      <div className="space-y-2.5 rounded-xl border border-brand-200 bg-brand-50/40 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="font-bold text-zinc-900">Seções da Página Inicial</div>
            <div className="text-xs text-zinc-500">
              Clique em qualquer seção para editar, arraste para reordenar ou adicione novas
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setAddSectionOpen((v) => !v)}
              aria-expanded={addSectionOpen}
              className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-2 py-1 text-xs font-semibold text-white hover:bg-brand-700"
            >
              <Plus className="h-3 w-3" aria-hidden="true" />
              Adicionar
            </button>
            <button
              aria-label="Restaurar ordem padrão"
              type="button"
              onClick={resetSectionLayout}
              title="Restaurar ordem padrão"
              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
            >
              <RotateCcw className="h-3 w-3" />
              Padrão
            </button>
          </div>
        </div>

        {addSectionOpen && (
          <div className="space-y-1.5 rounded-xl border border-brand-200 bg-white p-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-600">
                Escolha o tipo de seção
              </span>
              <button
                type="button"
                onClick={() => setAddSectionOpen(false)}
                aria-label="Fechar lista de tipos de seção"
                className="rounded p-0.5 text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-1">
              {CustomSectionKindSchema.options.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => addCustomSection(kind)}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-2.5 py-2 text-left text-xs hover:border-brand-400 hover:bg-brand-50/60"
                >
                  <div>
                    <div className="font-semibold text-zinc-800">{CUSTOM_SECTION_TYPE_LABELS[kind]}</div>
                    <div className="text-[10px] uppercase tracking-wide text-zinc-400">
                      {CUSTOM_SECTION_MODULE_LABELS[kind]}
                    </div>
                  </div>
                  <Plus className="h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          {sectionLayout.map((sec, idx) => {
            const isCustom = !isBuiltinSectionKey(sec.id);
            const selPayload = toSectionSelection(sec);
            return (
              <div
                key={sec.id}
                draggable
                onMouseEnter={() => hoverSidebarTarget(selPayload)}
                onMouseLeave={() => hoverSidebarTarget(null)}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(idx));
                  dragSectionIdxRef.current = idx;
                  setDragSectionIdx(idx);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDragOverIdx((prev) => (prev === idx ? prev : idx));
                }}
                onDragLeave={(e) => {
                  if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) {
                    return;
                  }
                  setDragOverIdx((prev) => (prev === idx ? null : prev));
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const raw = e.dataTransfer.getData("text/plain");
                  const from =
                    raw !== "" && !Number.isNaN(Number(raw)) ? Number(raw) : dragSectionIdxRef.current;
                  if (from !== null && from >= 0 && from < sectionLayout.length && from !== idx) {
                    moveSection(from, idx);
                  }
                  dragSectionIdxRef.current = null;
                  setDragSectionIdx(null);
                  setDragOverIdx(null);
                }}
                onDragEnd={() => {
                  dragSectionIdxRef.current = null;
                  setDragSectionIdx(null);
                  setDragOverIdx(null);
                }}
                className={`flex items-center gap-1.5 rounded-xl border px-2 py-1.5 transition ${
                  sec.enabled ? "text-irroba-ink" : "text-zinc-400"
                } ${
                  dragOverIdx === idx && dragSectionIdx !== idx
                    ? "border-brand-500 bg-brand-50"
                    : sec.enabled
                      ? "border-zinc-200 bg-white hover:border-brand-300"
                      : "border-dashed border-zinc-200 bg-zinc-100/80"
                } ${dragSectionIdx === idx ? "opacity-50 ring-2 ring-brand-400" : ""}`}
              >
                <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-zinc-400" />
                <button
                  type="button"
                  draggable={false}
                  onClick={() => selectAndFocusElement(selPayload, true)}
                  className="min-w-0 flex-1 text-left"
                  title={`Editar ${sec.label}`}
                >
                  <div className="truncate font-semibold leading-tight hover:text-brand-600">{sec.label}</div>
                  <div className="truncate text-xs font-medium uppercase tracking-wide text-zinc-400">
                    {sec.irrobaModule}
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    draggable={false}
                    onClick={() => selectAndFocusElement(selPayload, true)}
                    aria-label={`Editar ${sec.label}`}
                    title={`Editar ${sec.label}`}
                    className="rounded-lg p-1 text-zinc-500 hover:bg-brand-50 hover:text-brand-600"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {isCustom && (
                    <>
                      <button
                        type="button"
                        draggable={false}
                        onClick={() => duplicateCustomSection(sec.id)}
                        aria-label={`Duplicar ${sec.label}`}
                        title="Duplicar seção"
                        className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 hover:text-irroba-ink"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        draggable={false}
                        onClick={() => deleteCustomSection(sec.id)}
                        aria-label={`Excluir ${sec.label}`}
                        title="Excluir seção"
                        className="rounded-lg p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    draggable={false}
                    disabled={idx === 0}
                    onClick={() => moveSection(idx, idx - 1)}
                    aria-label="Mover para cima"
                    title="Mover para cima"
                    className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 hover:text-irroba-ink disabled:opacity-30"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    draggable={false}
                    disabled={idx === sectionLayout.length - 1}
                    onClick={() => moveSection(idx, idx + 1)}
                    aria-label="Mover para baixo"
                    title="Mover para baixo"
                    className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 hover:text-irroba-ink disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    draggable={false}
                    onClick={() => toggleSection(sec.id)}
                    aria-label={sec.enabled ? "Ocultar seção" : "Exibir seção"}
                    title={sec.enabled ? "Ocultar seção" : "Exibir seção"}
                    className={`rounded-lg p-1 ${
                      sec.enabled ? "text-brand-500 hover:bg-brand-50" : "text-zinc-400 hover:bg-zinc-200"
                    }`}
                  >
                    {sec.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Editor do Lookbook & Manifesto (Conteúdo HTML) */}
      <div className="space-y-2.5 rounded-xl border border-zinc-200 p-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-zinc-800">Lookbook &amp; Manifesto</span>
          <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-xs font-semibold text-brand-700">
            Conteúdo HTML
          </span>
        </div>
        <input
          aria-label="Etiqueta do manifesto"
          type="text"
          placeholder="Etiqueta (ex: 01 / Manifesto)"
          value={bp.sections.lookbook?.eyebrow ?? "01 / Manifesto"}
          onChange={(e) =>
            updateBp((prev) => ({
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
          className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
        />
        <input
          aria-label="Título do manifesto"
          type="text"
          placeholder="Título do Manifesto"
          value={bp.sections.lookbook?.headline ?? bp.sections.promoStripText}
          onChange={(e) =>
            updateBp((prev) => ({
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
          className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
        />
        <textarea
          aria-label="Narrativa da marca"
          rows={2}
          placeholder="Texto institucional / narrativa da marca"
          value={bp.sections.lookbook?.description ?? bp.footer.aboutText}
          onChange={(e) =>
            updateBp((prev) => ({
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
          className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
        />
        <AiImageSlot
          previewId={id}
          label="Foto Principal do Lookbook (16:9)"
          value={
            bp.sections.lookbook?.mainImageUrl ||
            bp.sections.secondaryBanner?.imageUrl ||
            bp.sections.hero.imageUrl
          }
          defaultAspectRatio="16:9"
          minRecommendedWidth={800}
          onChange={(nextUrl) =>
            updateBp((prev) => ({
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
          previewId={id}
          label="Foto Detalhe Sobreposta (1:1)"
          value={
            bp.sections.lookbook?.insetImageUrl || bp.products[1]?.imageUrl || bp.products[0]?.imageUrl || ""
          }
          defaultAspectRatio="1:1"
          minRecommendedWidth={500}
          onChange={(nextUrl) =>
            updateBp((prev) => ({
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

      {/* 3. Barra de Aviso Superior */}
      <div className="space-y-2 rounded-xl border border-zinc-200 p-3">
        <div className="font-bold text-zinc-800">Barra de Aviso do Topo</div>
        <AnnouncementBarControls bp={bp} onUpdateBp={updateBp} />
      </div>

      <div className="space-y-2.5 rounded-xl border border-zinc-200 p-3">
        <div className="font-bold text-zinc-800">Tipografia &amp; Arredondamento</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Field label="Fonte Títulos" labelClassName="mb-1 block text-zinc-500">
              <select
                value={bp.theme.headingFont}
                onChange={(e) =>
                  updateBp((prev) => ({
                    ...prev,
                    theme: { ...prev.theme, headingFont: e.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-200 px-2 py-1.5"
              >
                {!FONT_OPTIONS.includes(bp.theme.headingFont) && (
                  <option value={bp.theme.headingFont}>{bp.theme.headingFont}</option>
                )}
                {FONT_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div>
            <Field label="Fonte Corpo" labelClassName="mb-1 block text-zinc-500">
              <select
                value={bp.theme.bodyFont}
                onChange={(e) =>
                  updateBp((prev) => ({
                    ...prev,
                    theme: { ...prev.theme, bodyFont: e.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-200 px-2 py-1.5"
              >
                {!FONT_OPTIONS.includes(bp.theme.bodyFont) && (
                  <option value={bp.theme.bodyFont}>{bp.theme.bodyFont}</option>
                )}
                {FONT_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Field label="Arredondamento" labelClassName="mb-1 block text-zinc-500">
              <select
                value={bp.theme.radius}
                onChange={(e) =>
                  updateBp((prev) => ({
                    ...prev,
                    theme: {
                      ...prev.theme,
                      radius: e.target.value as StoreBlueprint["theme"]["radius"],
                    },
                  }))
                }
                className="w-full rounded-lg border border-zinc-200 px-2 py-1.5"
              >
                <option value="none">Sem arredondamento</option>
                <option value="small">Pequeno (6px)</option>
                <option value="medium">Médio (12px)</option>
                <option value="large">Grande (24px)</option>
              </select>
            </Field>
          </div>
          <div>
            <Field label="Cabeçalho Layout" labelClassName="mb-1 block text-zinc-500">
              <select
                value={bp.theme.headerLayout}
                onChange={(e) =>
                  updateBp((prev) => ({
                    ...prev,
                    theme: {
                      ...prev.theme,
                      headerLayout: e.target.value as StoreBlueprint["theme"]["headerLayout"],
                    },
                  }))
                }
                className="w-full rounded-lg border border-zinc-200 px-2 py-1.5"
              >
                <option value="layout-1">Layout 1 (Linha)</option>
                <option value="layout-2">Layout 2 (Centralizado)</option>
                <option value="layout-3">Layout 3 (Compacto)</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Field label="Cabeçalho Posição" labelClassName="mb-1 block text-zinc-500">
              <select
                value={bp.visualOverrides.header.position}
                onChange={(e) =>
                  updateBp((prev) => ({
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
                className="w-full rounded-lg border border-zinc-200 px-2 py-1.5"
              >
                <option value="default">Padrão (Rola com a página)</option>
                <option value="sticky">Fixo ao rolar</option>
                <option value="overlay">Sobreposto ao Banner (Fixo)</option>
              </select>
            </Field>
          </div>
          <div>
            <Field label="Alinhamento Vitrines" labelClassName="mb-1 block text-zinc-500">
              <select
                value={bp.visualOverrides.productCard.titleAlign}
                onChange={(e) =>
                  updateBp((prev) => ({
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
                className="w-full rounded-lg border border-zinc-200 px-2 py-1.5"
              >
                <option value="left">Esquerda</option>
                <option value="center">Centro</option>
                <option value="right">Direita</option>
              </select>
            </Field>
          </div>
        </div>
      </div>

      {/* Menu de Categorias */}
      <CategoryMenuPanel studio={studio} />

      {/* Vitrines & Produtos */}
      <div className="space-y-2 rounded-xl border border-zinc-200 p-3">
        <div className="font-bold text-zinc-800">
          Vitrines &amp; Produtos ({bp.products.filter((p) => p.visible !== false).length}/
          {bp.products.length})
        </div>
        {bp.sections.showcases.map((sc, idx) => (
          <input
            aria-label={`Título da vitrine ${idx + 1}`}
            key={idx}
            type="text"
            value={sc.title}
            onChange={(e) =>
              updateBp((prev) => ({
                ...prev,
                sections: {
                  ...prev.sections,
                  showcases: prev.sections.showcases.map((item, i) =>
                    i === idx ? { ...item, title: e.target.value } : item
                  ),
                },
              }))
            }
            className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 font-medium"
          />
        ))}
        <div className="max-h-48 space-y-1.5 overflow-y-auto pt-1">
          {bp.products.map((prod) => (
            <div
              key={prod.id}
              className="flex items-center gap-2 rounded border border-zinc-100 bg-zinc-50 px-2 py-1.5"
            >
              <input
                aria-label={`Exibir ${prod.title}`}
                type="checkbox"
                checked={prod.visible !== false}
                onChange={(e) =>
                  updateBp((prev) => ({
                    ...prev,
                    products: prev.products.map((p) =>
                      p.id === prod.id ? { ...p, visible: e.target.checked } : p
                    ),
                  }))
                }
              />
              <span className="flex-1 truncate text-xs text-zinc-700">{prod.title}</span>
              <button
                type="button"
                onClick={() =>
                  selectAndFocusElement(
                    {
                      targetId: "product-item",
                      productId: prod.id,
                      label: `Produto: ${prod.title.slice(0, 26)}`,
                    },
                    true
                  )
                }
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-700 hover:bg-brand-50 hover:text-brand-700"
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
