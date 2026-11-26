"use client";

import { Plus, Trash2 } from "lucide-react";
import { AiImageSlot } from "../../AiImageSlot";
import { Field } from "@/components/ui/Field";
import type { CustomSection, StoreBlueprint } from "@/lib/types/blueprint";
import type { CustomSectionUpdater } from "./types";

/** Editor da seção personalizada do tipo "gallery". */
export function GallerySectionEditor({
  section: activeCustomSection,
  update: updateCustomSection,
  bp,
  previewId,
}: {
  section: Extract<CustomSection, { kind: "gallery" }>;
  update: CustomSectionUpdater;
  bp: StoreBlueprint;
  previewId: string;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Field label="Subtítulo" labelClassName="mb-1 block text-zinc-500">
          <input
            type="text"
            value={activeCustomSection.subtitle ?? ""}
            onChange={(e) =>
              updateCustomSection((cs) => (cs.kind === "gallery" ? { ...cs, subtitle: e.target.value } : cs))
            }
            className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Field label="Colunas (Desktop)" labelClassName="mb-1 block text-zinc-500">
            <select
              value={activeCustomSection.columns}
              onChange={(e) =>
                updateCustomSection((cs) =>
                  cs.kind === "gallery" ? { ...cs, columns: Number(e.target.value) as 2 | 3 | 4 } : cs
                )
              }
              className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5"
            >
              <option value={2}>2 colunas</option>
              <option value={3}>3 colunas</option>
              <option value={4}>4 colunas</option>
            </select>
          </Field>
        </div>
        <div>
          <Field label="Altura do Card (PX)" labelClassName="mb-1 block text-zinc-500">
            <input
              type="number"
              min={180}
              max={900}
              value={activeCustomSection.cardHeightPx ?? 340}
              onChange={(e) =>
                updateCustomSection((cs) =>
                  cs.kind === "gallery"
                    ? {
                        ...cs,
                        cardHeightPx: Math.max(180, Math.min(900, Number(e.target.value) || 340)),
                      }
                    : cs
                )
              }
              className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
            />
          </Field>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-zinc-700">Cards da Galeria</span>
          <button
            type="button"
            onClick={() =>
              updateCustomSection((cs) =>
                cs.kind === "gallery"
                  ? {
                      ...cs,
                      items: [
                        ...cs.items,
                        {
                          id: `card-${Date.now().toString(36)}`,
                          title: `Card ${cs.items.length + 1}`,
                          subtitle: "Ver seleção",
                          imageUrl: bp.products[0]?.imageUrl ?? "",
                          href: "#vitrines",
                          enabled: true,
                        },
                      ],
                    }
                  : cs
              )
            }
            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            <Plus className="h-3 w-3" /> Card
          </button>
        </div>

        {activeCustomSection.items.map((item, idx) => (
          <div key={item.id || idx} className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-700">Card {idx + 1}</span>
              <button
                type="button"
                onClick={() =>
                  updateCustomSection((cs) =>
                    cs.kind === "gallery" ? { ...cs, items: cs.items.filter((_, i) => i !== idx) } : cs
                  )
                }
                className="rounded p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                title="Remover card"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                aria-label="Título"
                type="text"
                value={item.title}
                placeholder="Título"
                onChange={(e) =>
                  updateCustomSection((cs) =>
                    cs.kind === "gallery"
                      ? {
                          ...cs,
                          items: cs.items.map((it, i) => (i === idx ? { ...it, title: e.target.value } : it)),
                        }
                      : cs
                  )
                }
                className="rounded border border-zinc-200 bg-white px-2 py-1"
              />
              <input
                aria-label="Subtítulo"
                type="text"
                value={item.subtitle}
                placeholder="Subtítulo"
                onChange={(e) =>
                  updateCustomSection((cs) =>
                    cs.kind === "gallery"
                      ? {
                          ...cs,
                          items: cs.items.map((it, i) =>
                            i === idx ? { ...it, subtitle: e.target.value } : it
                          ),
                        }
                      : cs
                  )
                }
                className="rounded border border-zinc-200 bg-white px-2 py-1"
              />
            </div>
            <input
              aria-label="Link do botão (âncora ou URL)"
              type="text"
              value={item.href}
              placeholder="#vitrines"
              onChange={(e) =>
                updateCustomSection((cs) =>
                  cs.kind === "gallery"
                    ? {
                        ...cs,
                        items: cs.items.map((it, i) => (i === idx ? { ...it, href: e.target.value } : it)),
                      }
                    : cs
                )
              }
              className="w-full rounded border border-zinc-200 bg-white px-2 py-1"
            />
            <AiImageSlot
              previewId={previewId}
              label={`Imagem Card ${idx + 1} (3:4)`}
              value={item.imageUrl}
              defaultAspectRatio="3:4"
              minRecommendedWidth={500}
              onChange={(nextUrl) =>
                updateCustomSection((cs) =>
                  cs.kind === "gallery"
                    ? {
                        ...cs,
                        items: cs.items.map((it, i) => (i === idx ? { ...it, imageUrl: nextUrl } : it)),
                      }
                    : cs
                )
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
