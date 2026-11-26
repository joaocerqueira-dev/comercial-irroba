"use client";

import { AiImageSlot } from "@/components/studio/AiImageSlot";
import { BannerDimensionsControl } from "@/components/studio/BannerDimensionsControl";
import { ColorField } from "@/components/studio/ColorField";
import { BenefitsBannerEditor, HeroBannerEditor } from "@/components/studio/editors/BannerEditor";
import { patchMoodBanner, patchSecondaryBanner, patchSlimBanner } from "@/components/studio/editors/bannerUpdaters";
import type { StudioState } from "@/components/studio/useStudioState";

/** Aba Banners: principal, tarja de benefícios, slim, secundário e galeria editorial. */
export function BannersTab({ studio }: { studio: StudioState }) {
  const {
    id,
    bp,
    updateBp,
    handleDownloadBenefitsPng,
  } = studio;

  return (
    <div className="space-y-4">
      <HeroBannerEditor variant="tab" previewId={id} bp={bp} onUpdateBp={updateBp} />

      {/* Banner de Benefícios (Tarja Informativa) */}
      <BenefitsBannerEditor
        variant="tab"
        previewId={id}
        bp={bp}
        onUpdateBp={updateBp}
        onDownloadBenefitsPng={handleDownloadBenefitsPng}
      />

      {/* Banner Slim */}
      {bp.sections.slimBanner && (
        <div className="space-y-2.5 rounded-xl border border-zinc-200 p-3">
          <label className="flex items-center justify-between font-bold text-zinc-800">
            <span>Banner Slim Promocional</span>
            <input
              type="checkbox"
              checked={bp.sections.slimBanner.enabled}
              onChange={(e) =>
                updateBp(patchSlimBanner({ enabled: e.target.checked }))
              }
            />
          </label>
          <BannerDimensionsControl
            title="Tamanho do Banner Slim (PX)"
            heightPx={bp.sections.slimBanner.heightPx}
            defaultHeightPx={140}
            minHeightPx={48}
            maxHeightPx={500}
            widthPx={bp.sections.slimBanner.widthPx}
            defaultWidthPx={1280}
            objectFit={bp.sections.slimBanner.objectFit}
            onHeightChange={(h) =>
              updateBp(patchSlimBanner({ heightPx: h }))
            }
            onWidthChange={(w) =>
              updateBp(patchSlimBanner({ widthPx: w }))
            }
          />
          <select
            aria-label="Modo da faixa"
            value={bp.sections.slimBanner.mode}
            onChange={(e) =>
              updateBp(patchSlimBanner({ mode: e.target.value as "image" | "designed" }))
            }
            className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-zinc-800"
          >
            <option value="designed">Faixa Desenhada (Editável)</option>
            <option value="image">Imagem Banner Slim</option>
          </select>
          {bp.sections.slimBanner.mode === "image" ? (
            <AiImageSlot
              previewId={id}
              label="Arte Banner Slim (21:9)"
              value={bp.sections.slimBanner.imageUrl}
              defaultAspectRatio="21:9"
              minRecommendedWidth={1000}
              onChange={(nextUrl) =>
                updateBp(patchSlimBanner({ imageUrl: nextUrl }))
              }
            />
          ) : (
            <>
              <input
                aria-label="Mensagem da faixa"
                type="text"
                value={bp.sections.slimBanner.headline}
                onChange={(e) =>
                  updateBp(patchSlimBanner({ headline: e.target.value }))
                }
                className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
              />
              <div className="grid grid-cols-2 gap-2">
                <ColorField
                  label="Fundo"
                  value={bp.sections.slimBanner.backgroundColor}
                  onChange={(v) =>
                    updateBp(patchSlimBanner({ backgroundColor: v }))
                  }
                />
                <ColorField
                  label="Texto"
                  value={bp.sections.slimBanner.textColor}
                  onChange={(v) =>
                    updateBp(patchSlimBanner({ textColor: v }))
                  }
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Banner Secundário */}
      {bp.sections.secondaryBanner && (
        <div className="space-y-2.5 rounded-xl border border-zinc-200 p-3">
          <label className="flex items-center justify-between font-bold text-zinc-800">
            <span>Banner Secundário de Campanha</span>
            <input
              type="checkbox"
              checked={bp.sections.secondaryBanner.enabled}
              onChange={(e) =>
                updateBp(patchSecondaryBanner({ enabled: e.target.checked }))
              }
            />
          </label>
          <BannerDimensionsControl
            title="Tamanho do Banner Secundário (PX)"
            heightPx={bp.sections.secondaryBanner.heightPx}
            defaultHeightPx={420}
            minHeightPx={140}
            maxHeightPx={900}
            widthPx={bp.sections.secondaryBanner.widthPx}
            defaultWidthPx={1280}
            objectFit={bp.sections.secondaryBanner.objectFit}
            onHeightChange={(h) =>
              updateBp(patchSecondaryBanner({ heightPx: h }))
            }
            onWidthChange={(w) =>
              updateBp(patchSecondaryBanner({ widthPx: w }))
            }
            onObjectFitChange={(fit) =>
              updateBp(patchSecondaryBanner({ objectFit: fit }))
            }
          />
          <select
            aria-label="Modo do banner secundário"
            value={bp.sections.secondaryBanner.mode}
            onChange={(e) =>
              updateBp(patchSecondaryBanner({ mode: e.target.value as "artwork" | "editorial" }))
            }
            className="w-full rounded-lg border border-zinc-200 px-2 py-1.5"
          >
            <option value="artwork">Arte Completa (Imagem Larga)</option>
            <option value="editorial">Editorial (Imagem + Texto + Botão)</option>
          </select>
          <AiImageSlot
            previewId={id}
            label="Imagem Banner Secundário"
            value={bp.sections.secondaryBanner.imageUrl}
            defaultAspectRatio="16:9"
            minRecommendedWidth={900}
            onChange={(nextUrl) =>
              updateBp(patchSecondaryBanner({ imageUrl: nextUrl }))
            }
          />
          {bp.sections.secondaryBanner.mode === "editorial" && (
            <>
              <input
                aria-label="Título do banner secundário"
                type="text"
                value={bp.sections.secondaryBanner.headline}
                onChange={(e) =>
                  updateBp(patchSecondaryBanner({ headline: e.target.value }))
                }
                className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
              />
              <input
                aria-label="Texto do botão do banner secundário"
                type="text"
                value={bp.sections.secondaryBanner.ctaText}
                onChange={(e) =>
                  updateBp(patchSecondaryBanner({ ctaText: e.target.value }))
                }
                className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
              />
            </>
          )}
        </div>
      )}

      {/* Mosaico Mood / Categorias */}
      <div className="space-y-2.5 rounded-xl border border-zinc-200 p-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-zinc-800">Galeria Editorial (Mood / Coleções)</span>
          <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-xs font-semibold text-brand-700">
            Conteúdo HTML
          </span>
        </div>
        <input
          aria-label="Título da galeria editorial"
          type="text"
          value={bp.sections.moodSectionTitle}
          onChange={(e) =>
            updateBp((prev) => ({
              ...prev,
              sections: { ...prev.sections, moodSectionTitle: e.target.value },
            }))
          }
          className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
        />
        <BannerDimensionsControl
          title="Altura dos Cards da Galeria (PX)"
          heightPx={bp.sections.moodCardHeightPx}
          defaultHeightPx={380}
          minHeightPx={180}
          maxHeightPx={850}
          onHeightChange={(h) =>
            updateBp((prev) => ({
              ...prev,
              sections: { ...prev.sections, moodCardHeightPx: h },
            }))
          }
        />
        {bp.sections.moodBanners.map((m, idx) => (
          <div key={m.id} className="space-y-1.5 rounded-lg bg-zinc-50 p-2">
            <label className="flex items-center justify-between font-semibold text-zinc-700">
              <span>Card {idx + 1}</span>
              <input
                type="checkbox"
                checked={m.enabled}
                onChange={(e) =>
                  updateBp(patchMoodBanner(idx, { enabled: e.target.checked }))
                }
              />
            </label>
            <input
              aria-label={`Título da coleção ${idx + 1}`}
              type="text"
              value={m.title}
              onChange={(e) =>
                updateBp(patchMoodBanner(idx, { title: e.target.value }))
              }
              className="w-full rounded border border-zinc-200 bg-white px-2 py-1"
            />
            <AiImageSlot
              previewId={id}
              label={`Foto Card ${idx + 1} (3:4)`}
              value={m.imageUrl}
              defaultAspectRatio="3:4"
              minRecommendedWidth={500}
              onChange={(nextUrl) =>
                updateBp(patchMoodBanner(idx, { imageUrl: nextUrl }))
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
