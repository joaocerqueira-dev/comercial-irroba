"use client";

import { AiImageSlot } from "../AiImageSlot";
import { BannerDimensionsControl } from "../BannerDimensionsControl";
import { ColorField } from "../ColorField";
import { Field } from "@/components/ui/Field";
import { patchSecondaryBanner } from "../editors/bannerUpdaters";
import type { InspectorTargetProps } from "./types";

/** Banner secundário de campanha. */
export function SecondaryBannerInspector({ previewId, bp, onUpdateBp }: InspectorTargetProps) {
  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3">
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
          onUpdateBp(patchSecondaryBanner({ heightPx: h }))
        }
        onWidthChange={(w) =>
          onUpdateBp(patchSecondaryBanner({ widthPx: w }))
        }
        onObjectFitChange={(fit) =>
          onUpdateBp(patchSecondaryBanner({ objectFit: fit }))
        }
      />

      <div>
        <Field label="Modo do Banner" labelClassName="mb-1 block font-semibold text-zinc-700">
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
          className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-zinc-800"
        >
          <option value="artwork">Arte Completa (Imagem Larga)</option>
          <option value="editorial">Editorial (Imagem + Texto + Botão)</option>
        </select>
        </Field>
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
            aria-label="Título da campanha"
            type="text"
            placeholder="Título da campanha"
            value={bp.sections.secondaryBanner?.headline ?? ""}
            onChange={(e) =>
              onUpdateBp(patchSecondaryBanner({ headline: e.target.value }))
            }
            className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
          />
          <textarea
            aria-label="Subtítulo da campanha"
            rows={2}
            placeholder="Subtítulo da campanha"
            value={bp.sections.secondaryBanner?.subheadline ?? ""}
            onChange={(e) =>
              onUpdateBp(patchSecondaryBanner({ subheadline: e.target.value }))
            }
            className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
          />
          <input
            aria-label="Texto do botão da campanha"
            type="text"
            placeholder="Texto do botão"
            value={bp.sections.secondaryBanner?.ctaText ?? ""}
            onChange={(e) =>
              onUpdateBp(patchSecondaryBanner({ ctaText: e.target.value }))
            }
            className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
          />
          <div className="grid grid-cols-2 gap-2">
            <ColorField
              label="Fundo do Bloco"
              value={bp.sections.secondaryBanner?.backgroundColor ?? bp.theme.secondaryBackground}
              onChange={(v) =>
                onUpdateBp(patchSecondaryBanner({ backgroundColor: v }))
              }
            />
            <ColorField
              label="Cor do Texto"
              value={bp.sections.secondaryBanner?.textColor ?? bp.theme.secondaryForeground}
              contrastWith={
                bp.sections.secondaryBanner?.backgroundColor ?? bp.theme.secondaryBackground
              }
              onChange={(v) =>
                onUpdateBp(patchSecondaryBanner({ textColor: v }))
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
