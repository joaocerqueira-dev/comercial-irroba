"use client";

import { AiImageSlot } from "../../AiImageSlot";
import { BannerDimensionsControl } from "../../BannerDimensionsControl";
import { ColorField } from "../../ColorField";
import { Field } from "@/components/ui/Field";
import type { CustomSection, StoreBlueprint } from "@/lib/types/blueprint";
import type { CustomSectionUpdater } from "./types";

/** Editor da seção personalizada do tipo "banner". */
export function BannerSectionEditor({
  section: activeCustomSection,
  update: updateCustomSection,
  bp,
  previewId,
}: {
  section: Extract<CustomSection, { kind: "banner" }>;
  update: CustomSectionUpdater;
  bp: StoreBlueprint;
  previewId: string;
}) {
  return (
    <div className="space-y-3">
      <BannerDimensionsControl
        title="Dimensões do Banner (PX)"
        heightPx={activeCustomSection.heightPx}
        defaultHeightPx={420}
        minHeightPx={120}
        maxHeightPx={1000}
        widthPx={activeCustomSection.widthPx}
        defaultWidthPx={1920}
        minWidthPx={280}
        maxWidthPx={2560}
        objectFit={activeCustomSection.objectFit}
        onHeightChange={(v) =>
          updateCustomSection((cs) => (cs.kind === "banner" ? { ...cs, heightPx: v } : cs))
        }
        onWidthChange={(v) =>
          updateCustomSection((cs) => (cs.kind === "banner" ? { ...cs, widthPx: v } : cs))
        }
        onObjectFitChange={(v) =>
          updateCustomSection((cs) => (cs.kind === "banner" ? { ...cs, objectFit: v } : cs))
        }
      />
      <div>
        <Field label="Modo de Exibição" labelClassName="mb-1 block text-zinc-500">
          <select
            value={activeCustomSection.mode}
            onChange={(e) =>
              updateCustomSection((cs) =>
                cs.kind === "banner" ? { ...cs, mode: e.target.value as "artwork" | "editorial" } : cs
              )
            }
            className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-zinc-800"
          >
            <option value="editorial">Editorial (Foto + Texto sobreposto)</option>
            <option value="artwork">Arte Pronta (Apenas imagem)</option>
          </select>
        </Field>
      </div>
      {activeCustomSection.mode === "editorial" && (
        <div className="space-y-2">
          <input
            aria-label="Título principal"
            type="text"
            value={activeCustomSection.headline}
            placeholder="Título principal"
            onChange={(e) =>
              updateCustomSection((cs) => (cs.kind === "banner" ? { ...cs, headline: e.target.value } : cs))
            }
            className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
          />
          <input
            aria-label="Subtítulo"
            type="text"
            value={activeCustomSection.subheadline}
            placeholder="Subtítulo"
            onChange={(e) =>
              updateCustomSection((cs) =>
                cs.kind === "banner" ? { ...cs, subheadline: e.target.value } : cs
              )
            }
            className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              aria-label="Texto CTA"
              type="text"
              value={activeCustomSection.ctaText}
              placeholder="Texto CTA"
              onChange={(e) =>
                updateCustomSection((cs) => (cs.kind === "banner" ? { ...cs, ctaText: e.target.value } : cs))
              }
              className="rounded-lg border border-zinc-200 px-2.5 py-1.5"
            />
            <input
              aria-label="Link do botão (âncora ou URL)"
              type="text"
              value={activeCustomSection.ctaHref}
              placeholder="#vitrines"
              onChange={(e) =>
                updateCustomSection((cs) => (cs.kind === "banner" ? { ...cs, ctaHref: e.target.value } : cs))
              }
              className="rounded-lg border border-zinc-200 px-2.5 py-1.5"
            />
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <ColorField
          label="Fundo"
          value={activeCustomSection.backgroundColor ?? bp.theme.primaryBackground}
          onChange={(v) =>
            updateCustomSection((cs) => (cs.kind === "banner" ? { ...cs, backgroundColor: v } : cs))
          }
        />
        <ColorField
          label="Texto"
          value={activeCustomSection.textColor ?? bp.theme.primaryForeground}
          contrastWith={activeCustomSection.backgroundColor ?? bp.theme.primaryBackground}
          onChange={(v) => updateCustomSection((cs) => (cs.kind === "banner" ? { ...cs, textColor: v } : cs))}
        />
      </div>
      <AiImageSlot
        previewId={previewId}
        label="Imagem do Banner (16:9)"
        value={activeCustomSection.imageUrl}
        defaultAspectRatio="16:9"
        minRecommendedWidth={1200}
        onChange={(nextUrl) =>
          updateCustomSection((cs) => (cs.kind === "banner" ? { ...cs, imageUrl: nextUrl } : cs))
        }
      />
    </div>
  );
}
