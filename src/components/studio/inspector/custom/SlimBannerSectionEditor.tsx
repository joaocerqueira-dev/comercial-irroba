"use client";

import { AiImageSlot } from "../../AiImageSlot";
import { BannerDimensionsControl } from "../../BannerDimensionsControl";
import { ColorField } from "../../ColorField";
import { Field } from "@/components/ui/Field";
import type { CustomSection, StoreBlueprint } from "@/lib/types/blueprint";
import type { CustomSectionUpdater } from "./types";

/** Editor da seção personalizada do tipo "slimBanner". */
export function SlimBannerSectionEditor({
  section: activeCustomSection,
  update: updateCustomSection,
  bp,
  previewId,
}: {
  section: Extract<CustomSection, { kind: "slimBanner" }>;
  update: CustomSectionUpdater;
  bp: StoreBlueprint;
  previewId: string;
}) {
  return (
    <div className="space-y-3">
      <BannerDimensionsControl
        title="Tamanho do Banner Slim (PX)"
        heightPx={activeCustomSection.heightPx}
        defaultHeightPx={120}
        minHeightPx={40}
        maxHeightPx={600}
        widthPx={activeCustomSection.widthPx}
        defaultWidthPx={1280}
        minWidthPx={280}
        maxWidthPx={2560}
        objectFit={activeCustomSection.objectFit}
        onHeightChange={(v) =>
          updateCustomSection((cs) => (cs.kind === "slimBanner" ? { ...cs, heightPx: v } : cs))
        }
        onWidthChange={(v) =>
          updateCustomSection((cs) => (cs.kind === "slimBanner" ? { ...cs, widthPx: v } : cs))
        }
        onObjectFitChange={(v) =>
          updateCustomSection((cs) => (cs.kind === "slimBanner" ? { ...cs, objectFit: v } : cs))
        }
      />
      <div>
        <Field label="Formato" labelClassName="mb-1 block text-zinc-500">
          <select
            value={activeCustomSection.mode}
            onChange={(e) =>
              updateCustomSection((cs) =>
                cs.kind === "slimBanner" ? { ...cs, mode: e.target.value as "designed" | "image" } : cs
              )
            }
            className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5"
          >
            <option value="designed">Faixa Tipográfica</option>
            <option value="image">Imagem Upload / IA</option>
          </select>
        </Field>
      </div>
      {activeCustomSection.mode === "designed" ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              aria-label="Selo (ex: DESTAQUE)"
              type="text"
              value={activeCustomSection.badgeText}
              placeholder="Selo (ex: DESTAQUE)"
              onChange={(e) =>
                updateCustomSection((cs) =>
                  cs.kind === "slimBanner" ? { ...cs, badgeText: e.target.value } : cs
                )
              }
              className="rounded-lg border border-zinc-200 px-2.5 py-1.5"
            />
            <input
              aria-label="Botão"
              type="text"
              value={activeCustomSection.ctaText}
              placeholder="Botão"
              onChange={(e) =>
                updateCustomSection((cs) =>
                  cs.kind === "slimBanner" ? { ...cs, ctaText: e.target.value } : cs
                )
              }
              className="rounded-lg border border-zinc-200 px-2.5 py-1.5"
            />
          </div>
          <input
            aria-label="Frase promocional"
            type="text"
            value={activeCustomSection.headline}
            placeholder="Frase promocional"
            onChange={(e) =>
              updateCustomSection((cs) =>
                cs.kind === "slimBanner" ? { ...cs, headline: e.target.value } : cs
              )
            }
            className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
          />
          <div className="grid grid-cols-2 gap-2">
            <ColorField
              label="Fundo"
              value={activeCustomSection.backgroundColor ?? bp.theme.primaryBackground}
              onChange={(v) =>
                updateCustomSection((cs) => (cs.kind === "slimBanner" ? { ...cs, backgroundColor: v } : cs))
              }
            />
            <ColorField
              label="Texto"
              value={activeCustomSection.textColor ?? bp.theme.primaryForeground}
              contrastWith={activeCustomSection.backgroundColor ?? bp.theme.primaryBackground}
              onChange={(v) =>
                updateCustomSection((cs) => (cs.kind === "slimBanner" ? { ...cs, textColor: v } : cs))
              }
            />
          </div>
        </div>
      ) : (
        <AiImageSlot
          previewId={previewId}
          label="Arte do Banner Slim (21:9)"
          value={activeCustomSection.imageUrl}
          defaultAspectRatio="21:9"
          minRecommendedWidth={1200}
          onChange={(nextUrl) =>
            updateCustomSection((cs) => (cs.kind === "slimBanner" ? { ...cs, imageUrl: nextUrl } : cs))
          }
        />
      )}
    </div>
  );
}
