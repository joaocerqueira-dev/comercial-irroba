"use client";

import { HeroBannerEditor } from "../editors/BannerEditor";
import type { InspectorTargetProps } from "./types";

/** Banner principal (hero): mesmo editor da aba Banners, com navegação pelos slides. */
export function HeroInspector({ previewId, bp, selection, onUpdateBp, onShowSlide }: InspectorTargetProps) {
  return (
    <HeroBannerEditor
      variant="inspector"
      previewId={previewId}
      bp={bp}
      onUpdateBp={onUpdateBp}
      activeSlideIdx={selection.subIndex}
      onShowSlide={onShowSlide}
    />
  );
}
