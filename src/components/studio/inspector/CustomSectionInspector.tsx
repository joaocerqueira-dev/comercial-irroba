"use client";

import { Field } from "@/components/ui/Field";
import {
  CUSTOM_SECTION_MODULE_LABELS,
  getNormalizedSectionLayout,
  type CustomSection,
} from "@/lib/types/blueprint";
import { findActiveCustomSection, type InspectorTargetProps } from "./types";
import { HtmlSectionEditor } from "./custom/HtmlSectionEditor";
import { BannerSectionEditor } from "./custom/BannerSectionEditor";
import { SlimBannerSectionEditor } from "./custom/SlimBannerSectionEditor";
import { ShowcaseSectionEditor } from "./custom/ShowcaseSectionEditor";
import { GallerySectionEditor } from "./custom/GallerySectionEditor";
import { TarjaSectionEditor } from "./custom/TarjaSectionEditor";
import { EditorialSplitSectionEditor } from "./custom/EditorialSplitSectionEditor";

/** Seções personalizadas adicionadas pelo construtor (HTML, banner, faixa, vitrine, galeria, tarja, editorial). */
export function CustomSectionInspector({ previewId, bp, selection, onUpdateBp }: InspectorTargetProps) {
  const activeCustomSection = findActiveCustomSection(bp, selection);
  if (!activeCustomSection) return null;

  const updateCustomSection = (updater: (cs: CustomSection) => CustomSection) => {
    onUpdateBp((prev) => {
      const nextCustom = (prev.sections.customSections ?? []).map((item) =>
        item.id === activeCustomSection.id ? updater(item) : item
      );
      const updated = nextCustom.find((item) => item.id === activeCustomSection.id);
      const nextLayout = updated
        ? getNormalizedSectionLayout(prev.sections.layout, nextCustom).map((s) =>
            s.id === updated.id
              ? {
                  ...s,
                  label: updated.title,
                  irrobaModule: CUSTOM_SECTION_MODULE_LABELS[updated.kind],
                }
              : s
          )
        : prev.sections.layout;
      return {
        ...prev,
        sections: {
          ...prev.sections,
          customSections: nextCustom,
          layout: nextLayout,
        },
      };
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3">
      <div>
        <Field label="Título da Seção" labelClassName="mb-1 block font-semibold text-zinc-700">
          <input
            type="text"
            value={activeCustomSection.title}
            onChange={(e) => updateCustomSection((cs) => ({ ...cs, title: e.target.value }))}
            className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-zinc-800"
          />
        </Field>
      </div>

      {activeCustomSection.kind === "html" && (
        <HtmlSectionEditor
          section={activeCustomSection}
          update={updateCustomSection}
          bp={bp}
          previewId={previewId}
        />
      )}

      {activeCustomSection.kind === "banner" && (
        <BannerSectionEditor
          section={activeCustomSection}
          update={updateCustomSection}
          bp={bp}
          previewId={previewId}
        />
      )}

      {activeCustomSection.kind === "slimBanner" && (
        <SlimBannerSectionEditor
          section={activeCustomSection}
          update={updateCustomSection}
          bp={bp}
          previewId={previewId}
        />
      )}

      {activeCustomSection.kind === "showcase" && (
        <ShowcaseSectionEditor section={activeCustomSection} update={updateCustomSection} bp={bp} />
      )}

      {activeCustomSection.kind === "gallery" && (
        <GallerySectionEditor
          section={activeCustomSection}
          update={updateCustomSection}
          bp={bp}
          previewId={previewId}
        />
      )}

      {activeCustomSection.kind === "tarja" && (
        <TarjaSectionEditor section={activeCustomSection} update={updateCustomSection} bp={bp} />
      )}

      {activeCustomSection.kind === "editorialSplit" && (
        <EditorialSplitSectionEditor
          section={activeCustomSection}
          update={updateCustomSection}
          bp={bp}
          previewId={previewId}
        />
      )}
    </div>
  );
}
