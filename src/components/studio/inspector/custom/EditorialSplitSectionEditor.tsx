"use client";

import { AiImageSlot } from "../../AiImageSlot";
import { ColorField } from "../../ColorField";
import { Field } from "@/components/ui/Field";
import type { CustomSection, StoreBlueprint } from "@/lib/types/blueprint";
import type { CustomSectionUpdater } from "./types";

/** Editor da seção personalizada do tipo "editorialSplit". */
export function EditorialSplitSectionEditor({
  section: activeCustomSection,
  update: updateCustomSection,
  bp,
  previewId,
}: {
  section: Extract<CustomSection, { kind: "editorialSplit" }>;
  update: CustomSectionUpdater;
  bp: StoreBlueprint;
  previewId: string;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Field label="Sobretítulo (Eyebrow)" labelClassName="mb-1 block text-zinc-500">
            <input
              type="text"
              value={activeCustomSection.eyebrow}
              onChange={(e) =>
                updateCustomSection((cs) =>
                  cs.kind === "editorialSplit" ? { ...cs, eyebrow: e.target.value } : cs
                )
              }
              className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
            />
          </Field>
        </div>
        <div>
          <Field label="Lado da Imagem" labelClassName="mb-1 block text-zinc-500">
            <select
              value={activeCustomSection.imageSide}
              onChange={(e) =>
                updateCustomSection((cs) =>
                  cs.kind === "editorialSplit" ? { ...cs, imageSide: e.target.value as "left" | "right" } : cs
                )
              }
              className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5"
            >
              <option value="left">Esquerda</option>
              <option value="right">Direita</option>
            </select>
          </Field>
        </div>
      </div>
      <input
        aria-label="Título principal"
        type="text"
        value={activeCustomSection.headline}
        placeholder="Título principal"
        onChange={(e) =>
          updateCustomSection((cs) =>
            cs.kind === "editorialSplit" ? { ...cs, headline: e.target.value } : cs
          )
        }
        className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
      />
      <textarea
        aria-label="Descrição"
        rows={3}
        value={activeCustomSection.description}
        placeholder="Descrição"
        onChange={(e) =>
          updateCustomSection((cs) =>
            cs.kind === "editorialSplit" ? { ...cs, description: e.target.value } : cs
          )
        }
        className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          aria-label="Botão CTA"
          type="text"
          value={activeCustomSection.ctaText}
          placeholder="Botão CTA"
          onChange={(e) =>
            updateCustomSection((cs) =>
              cs.kind === "editorialSplit" ? { ...cs, ctaText: e.target.value } : cs
            )
          }
          className="rounded-lg border border-zinc-200 px-2.5 py-1.5"
        />
        <input
          aria-label="Link do botão (âncora ou URL)"
          type="text"
          value={activeCustomSection.ctaHref}
          placeholder="#vitrines"
          onChange={(e) =>
            updateCustomSection((cs) =>
              cs.kind === "editorialSplit" ? { ...cs, ctaHref: e.target.value } : cs
            )
          }
          className="rounded-lg border border-zinc-200 px-2.5 py-1.5"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ColorField
          label="Fundo"
          value={activeCustomSection.backgroundColor ?? bp.theme.neutralBackground}
          onChange={(v) =>
            updateCustomSection((cs) => (cs.kind === "editorialSplit" ? { ...cs, backgroundColor: v } : cs))
          }
        />
        <ColorField
          label="Texto"
          value={activeCustomSection.textColor ?? bp.theme.neutralForeground}
          contrastWith={activeCustomSection.backgroundColor ?? bp.theme.neutralBackground}
          onChange={(v) =>
            updateCustomSection((cs) => (cs.kind === "editorialSplit" ? { ...cs, textColor: v } : cs))
          }
        />
      </div>
      <AiImageSlot
        previewId={previewId}
        label="Imagem Editorial (3:4)"
        value={activeCustomSection.imageUrl}
        defaultAspectRatio="3:4"
        minRecommendedWidth={600}
        onChange={(nextUrl) =>
          updateCustomSection((cs) => (cs.kind === "editorialSplit" ? { ...cs, imageUrl: nextUrl } : cs))
        }
      />
    </div>
  );
}
