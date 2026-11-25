"use client";

import { AiImageSlot } from "../AiImageSlot";
import { BannerDimensionsControl } from "../BannerDimensionsControl";
import { ColorField } from "../ColorField";
import { PALETTE } from "@/lib/layout-patterns/palette";
import { Field } from "@/components/ui/Field";
import { patchSlimBanner } from "../editors/bannerUpdaters";
import type { InspectorTargetProps } from "./types";

/** Banner slim promocional. */
export function SlimBannerInspector({ previewId, bp, onUpdateBp }: InspectorTargetProps) {
  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3">
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
          onUpdateBp(patchSlimBanner({ heightPx: h }))
        }
        onWidthChange={(w) =>
          onUpdateBp(patchSlimBanner({ widthPx: w }))
        }
        onObjectFitChange={
          bp.sections.slimBanner?.mode === "image"
            ? (fit) =>
                onUpdateBp(patchSlimBanner({ objectFit: fit }))
            : undefined
        }
      />

      <div>
        <Field label="Modo da Faixa" labelClassName="mb-1 block font-semibold text-zinc-700">
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
          className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-zinc-800"
        >
          <option value="designed">Faixa Desenhada (Texto + Selo + Botão)</option>
          <option value="image">Imagem Banner Slim (Upload / IA)</option>
        </select>
        </Field>
      </div>

      {bp.sections.slimBanner?.mode === "image" ? (
        <AiImageSlot
          previewId={previewId}
          label="Arte Banner Slim (21:9)"
          value={bp.sections.slimBanner.imageUrl}
          defaultAspectRatio="21:9"
          minRecommendedWidth={1000}
          onChange={(nextUrl) =>
            onUpdateBp(patchSlimBanner({ imageUrl: nextUrl }))
          }
        />
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Field label="Selo" labelClassName="mb-1 block text-zinc-500">
              <input
                type="text"
                value={bp.sections.slimBanner?.badgeText ?? "DESTAQUE"}
                onChange={(e) =>
                  onUpdateBp(patchSlimBanner({ badgeText: e.target.value }))
                }
                className="w-full rounded-lg border border-zinc-200 px-2 py-1"
              />
              </Field>
            </div>
            <div>
              <Field label="Texto do Botão" labelClassName="mb-1 block text-zinc-500">
              <input
                type="text"
                value={bp.sections.slimBanner?.ctaText ?? "Aproveitar"}
                onChange={(e) =>
                  onUpdateBp(patchSlimBanner({ ctaText: e.target.value }))
                }
                className="w-full rounded-lg border border-zinc-200 px-2 py-1"
              />
              </Field>
            </div>
          </div>
          <div>
            <Field label="Mensagem Promocional" labelClassName="mb-1 block text-zinc-500">
            <input
              type="text"
              value={bp.sections.slimBanner?.headline ?? ""}
              onChange={(e) =>
                onUpdateBp(patchSlimBanner({ headline: e.target.value }))
              }
              className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
            />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ColorField
              label="Fundo"
              value={bp.sections.slimBanner?.backgroundColor ?? PALETTE.ink}
              onChange={(v) =>
                onUpdateBp(patchSlimBanner({ backgroundColor: v }))
              }
            />
            <ColorField
              label="Texto"
              value={bp.sections.slimBanner?.textColor ?? PALETTE.white}
              contrastWith={bp.sections.slimBanner?.backgroundColor ?? PALETTE.ink}
              onChange={(v) =>
                onUpdateBp(patchSlimBanner({ textColor: v }))
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
