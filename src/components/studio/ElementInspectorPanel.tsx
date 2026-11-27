"use client";

import { useEffect, useState, type ComponentType } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Copy, Eye, EyeOff, Trash2 } from "lucide-react";
import { CUSTOM_SECTION_MODULE_LABELS, getNormalizedSectionLayout, type StoreBlueprint } from "@/lib/types/blueprint";
import { INSPECTOR_META, type InspectorSelection, type InspectorTargetId } from "./inspectorTargets";
import { useLatest } from "@/lib/client/useLatest";
import { findActiveCustomSection, findSelectedProduct, type InspectorTargetProps } from "./inspector/types";
import { CustomSectionInspector } from "./inspector/CustomSectionInspector";
import { AnnouncementInspector } from "./inspector/AnnouncementInspector";
import { BuyButtonInspector } from "./inspector/BuyButtonInspector";
import { EditorialGalleryInspector } from "./inspector/EditorialGalleryInspector";
import { EditorialLookbookInspector } from "./inspector/EditorialLookbookInspector";
import { FooterInspector } from "./inspector/FooterInspector";
import { FooterLegalInspector } from "./inspector/FooterLegalInspector";
import { HeaderInspector } from "./inspector/HeaderInspector";
import { HeaderLogoInspector } from "./inspector/HeaderLogoInspector";
import { HeaderNavInspector } from "./inspector/HeaderNavInspector";
import { HeroInspector } from "./inspector/HeroInspector";
import { NewsletterInspector } from "./inspector/NewsletterInspector";
import { PdpInspector } from "./inspector/PdpInspector";
import { ProductItemInspector } from "./inspector/ProductItemInspector";
import { SecondaryBannerInspector } from "./inspector/SecondaryBannerInspector";
import { ShowcaseInspector } from "./inspector/ShowcaseInspector";
import { SlimBannerInspector } from "./inspector/SlimBannerInspector";
import { TarjaInspector } from "./inspector/TarjaInspector";
import { TestimonialsInspector } from "./inspector/TestimonialsInspector";

interface ElementInspectorPanelProps {
  previewId: string;
  bp: StoreBlueprint;
  selection: InspectorSelection;
  onUpdateBp: (updater: (prev: StoreBlueprint) => StoreBlueprint) => void;
  onSelect: (next: InspectorSelection | null) => void;
  onToggleSection: (sectionId: string) => void;
  onMoveSection: (fromIdx: number, toIdx: number) => void;
  onDuplicateCustomSection?: (customSectionId: string) => void;
  onDeleteCustomSection?: (customSectionId: string) => void;
  onDownloadBenefitsPng: () => void;
  onShowSlide?: (slideIdx: number) => void;
}

/** Editor de cada alvo do Inspector. Vitrine principal e adicionais compartilham o mesmo. */
const INSPECTOR_EDITORS: Record<InspectorTargetId, ComponentType<InspectorTargetProps>> = {
  announcement: AnnouncementInspector,
  "header-logo": HeaderLogoInspector,
  "header-nav": HeaderNavInspector,
  header: HeaderInspector,
  hero: HeroInspector,
  tarja: TarjaInspector,
  editorialGallery: EditorialGalleryInspector,
  slimBanner: SlimBannerInspector,
  "product-item": ProductItemInspector,
  "buy-button": BuyButtonInspector,
  showcase1: ShowcaseInspector,
  extraShowcases: ShowcaseInspector,
  secondaryBanner: SecondaryBannerInspector,
  editorialLookbook: EditorialLookbookInspector,
  testimonials: TestimonialsInspector,
  newsletter: NewsletterInspector,
  footer: FooterInspector,
  "footer-legal": FooterLegalInspector,
  pdp: PdpInspector,
  "custom-section": CustomSectionInspector,
};

export function ElementInspectorPanel(props: ElementInspectorPanelProps) {
  const { bp, selection, onSelect, onToggleSection, onMoveSection, onDuplicateCustomSection, onDeleteCustomSection } =
    props;
  const [newCategoryName, setNewCategoryName] = useState("");
  const meta = INSPECTOR_META[selection.targetId];
  const sectionLayout = getNormalizedSectionLayout(bp.sections.layout, bp.sections.customSections);
  const activeCustomSection = findActiveCustomSection(bp, selection);
  const activeSectionId = activeCustomSection?.id ?? meta.sectionKey ?? null;
  const sectionIdx = activeSectionId ? sectionLayout.findIndex((s) => s.id === activeSectionId) : -1;
  const sectionEntry = sectionIdx >= 0 ? sectionLayout[sectionIdx] : null;

  // Produto selecionado deixou de existir (ex.: removido): limpa a seleção fora do render
  const missingProduct = selection.targetId === "product-item" && !findSelectedProduct(bp, selection);
  // Idem para seção personalizada excluída/inexistente
  const missingCustomSection = selection.targetId === "custom-section" && !activeCustomSection;
  const missingTarget = missingProduct || missingCustomSection;
  const onSelectRef = useLatest(onSelect);
  useEffect(() => {
    if (missingTarget) onSelectRef.current(null);
  }, [missingTarget, onSelectRef]);

  const TargetEditor = INSPECTOR_EDITORS[selection.targetId];

  return (
    <div className="space-y-3.5">
      {/* Sticky Element Context Header */}
      <div className="rounded-xl border border-brand-200 bg-brand-50/80 p-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-white px-2.5 py-1 text-xs font-semibold text-irroba-ink hover:bg-brand-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Todos os elementos
          </button>

          {sectionEntry && activeSectionId && (
            <div className="flex items-center gap-1">
              {activeCustomSection && onDuplicateCustomSection && (
                <button
                  type="button"
                  onClick={() => onDuplicateCustomSection(activeCustomSection.id)}
                  aria-label="Duplicar seção"
                  title="Duplicar seção"
                  className="rounded-lg border border-zinc-200 bg-white p-1 text-zinc-600 hover:bg-zinc-50"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              )}
              {activeCustomSection && onDeleteCustomSection && (
                <button
                  type="button"
                  onClick={() => onDeleteCustomSection(activeCustomSection.id)}
                  aria-label="Excluir seção"
                  title="Excluir seção"
                  className="rounded-lg border border-zinc-200 bg-white p-1 text-zinc-500 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                disabled={sectionIdx <= 0}
                onClick={() => onMoveSection(sectionIdx, sectionIdx - 1)}
                aria-label="Subir seção na página"
                title="Subir seção na página"
                className="rounded-lg border border-zinc-200 bg-white p-1 text-zinc-600 hover:bg-zinc-50 disabled:opacity-35"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={sectionIdx < 0 || sectionIdx >= sectionLayout.length - 1}
                onClick={() => onMoveSection(sectionIdx, sectionIdx + 1)}
                aria-label="Descer seção na página"
                title="Descer seção na página"
                className="rounded-lg border border-zinc-200 bg-white p-1 text-zinc-600 hover:bg-zinc-50 disabled:opacity-35"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onToggleSection(activeSectionId)}
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold ${
                  sectionEntry.enabled
                    ? "border-brand-300 bg-white text-brand-700 hover:bg-brand-50"
                    : "border-zinc-300 bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {sectionEntry.enabled ? (
                  <>
                    <Eye className="h-3 w-3" />
                    Visível
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3 w-3" />
                    Oculta
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="mt-2.5">
          <div className="font-heading text-[11px] font-bold uppercase tracking-wider text-brand-600">
            {activeCustomSection ? CUSTOM_SECTION_MODULE_LABELS[activeCustomSection.kind] : meta.irrobaRef}
          </div>
          <div className="font-heading text-sm font-bold text-irroba-ink">
            {activeCustomSection?.title || selection.label || meta.title}
          </div>
        </div>
      </div>

      {/* key: remonta o editor ao trocar de alvo (undo/prompt/erro de imagem não vazam entre seções/produtos) */}
      <TargetEditor
        key={[selection.targetId, selection.customSectionId, selection.productId, selection.showcaseIdx, selection.subIndex].join(":")}
        {...props}
        categoryDraft={newCategoryName}
        onCategoryDraftChange={setNewCategoryName}
      />
    </div>
  );
}
