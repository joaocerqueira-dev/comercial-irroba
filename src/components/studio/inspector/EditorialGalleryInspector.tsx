"use client";

import { Plus } from "lucide-react";
import { AiImageSlot } from "../AiImageSlot";
import { BannerDimensionsControl } from "../BannerDimensionsControl";
import { Field } from "@/components/ui/Field";
import { patchMoodBanner } from "../editors/bannerUpdaters";
import type { InspectorTargetProps } from "./types";

/** Galeria editorial (mood banners 3:4). */
export function EditorialGalleryInspector({ previewId, bp, selection, onUpdateBp }: InspectorTargetProps) {
  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3">
      <div>
        <Field label="Título da Seção" labelClassName="mb-1 block font-semibold text-zinc-700">
        <input
          type="text"
          value={bp.sections.moodSectionTitle}
          onChange={(e) =>
            onUpdateBp((prev) => ({
              ...prev,
              sections: { ...prev.sections, moodSectionTitle: e.target.value },
            }))
          }
          className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
        />
        </Field>
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
        <span className="font-semibold text-zinc-700">Cards da Galeria (até 4 ativos)</span>
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
            className="inline-flex items-center gap-1 rounded-md bg-irroba-ink px-2 py-1 text-xs font-semibold text-white"
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
              ? "border-brand-400 bg-brand-50/50"
              : "border-zinc-200 bg-zinc-50"
          }`}
        >
          <label className="flex items-center justify-between font-semibold text-zinc-700">
            <span>Card {idx + 1}</span>
            <input
              type="checkbox"
              checked={m.enabled}
              onChange={(e) =>
                onUpdateBp(patchMoodBanner(idx, { enabled: e.target.checked }))
              }
            />
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <input
              aria-label="Título da coleção"
              type="text"
              value={m.title}
              placeholder="Título da coleção"
              onChange={(e) =>
                onUpdateBp(patchMoodBanner(idx, { title: e.target.value }))
              }
              className="rounded border border-zinc-200 bg-white px-2 py-1"
            />
            <input
              aria-label="Selo da coleção"
              type="text"
              value={m.subtitle}
              placeholder="Selo (ex: Curadoria)"
              onChange={(e) =>
                onUpdateBp(patchMoodBanner(idx, { subtitle: e.target.value }))
              }
              className="rounded border border-zinc-200 bg-white px-2 py-1"
            />
          </div>
          <AiImageSlot
            previewId={previewId}
            label={`Foto do Card ${idx + 1} (3:4)`}
            value={m.imageUrl}
            defaultAspectRatio="3:4"
            minRecommendedWidth={500}
            onChange={(nextUrl) =>
              onUpdateBp(patchMoodBanner(idx, { imageUrl: nextUrl }))
            }
          />
        </div>
      ))}
    </div>
  );
}
