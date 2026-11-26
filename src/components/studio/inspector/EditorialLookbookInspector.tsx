"use client";

import { AiImageSlot } from "../AiImageSlot";
import { Field } from "@/components/ui/Field";
import { getDefaultEditorialLookbookHtml } from "@/lib/irroba-blocks/compiler";
import { HtmlAiEditor } from "../HtmlAiEditor";
import type { InspectorTargetProps } from "./types";

/** Lookbook & manifesto. */
export function EditorialLookbookInspector({ previewId, bp, onUpdateBp }: InspectorTargetProps) {
  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Field label="Etiqueta Superior" labelClassName="mb-1 block text-zinc-500">
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
              className="w-full rounded-lg border border-zinc-200 px-2 py-1.5"
            />
          </Field>
        </div>
        <div>
          <Field label="Texto do Botão" labelClassName="mb-1 block text-zinc-500">
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
              className="w-full rounded-lg border border-zinc-200 px-2 py-1.5"
            />
          </Field>
        </div>
      </div>

      <div>
        <Field label="Título do Manifesto" labelClassName="mb-1 block text-zinc-500">
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
            className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
          />
        </Field>
      </div>

      <div>
        <Field label="Narrativa da Marca" labelClassName="mb-1 block text-zinc-500">
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
            className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
          />
        </Field>
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
          bp.sections.lookbook?.insetImageUrl || bp.products[1]?.imageUrl || bp.products[0]?.imageUrl || ""
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

      {(() => {
        const defaultLookbookHtml = getDefaultEditorialLookbookHtml(bp);
        return (
          <details className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-2.5">
            <summary className="cursor-pointer select-none text-xs font-semibold text-emerald-900">
              Editar HTML com IA (Avançado)
              {bp.sections.editorialLookbookCustomHtml ? " · Customizado" : ""}
            </summary>
            <div className="mt-3">
              <HtmlAiEditor
                previewId={previewId}
                html={bp.sections.editorialLookbookCustomHtml ?? defaultLookbookHtml}
                defaultResetHtml={defaultLookbookHtml}
                sectionTitle={bp.sections.lookbook?.headline || "Lookbook & Manifesto"}
                widthMode="container"
                bp={bp}
                onChange={(nextHtml) =>
                  onUpdateBp((prev) => ({
                    ...prev,
                    sections: {
                      ...prev.sections,
                      editorialLookbookCustomHtml:
                        nextHtml === defaultLookbookHtml || !nextHtml.trim() ? undefined : nextHtml,
                    },
                  }))
                }
              />
            </div>
          </details>
        );
      })()}
    </div>
  );
}
