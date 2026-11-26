"use client";

import { BenefitsBannerEditor } from "../editors/BannerEditor";
import type { InspectorTargetProps } from "./types";

/** Tarja informativa (benefícios): mesmo editor da aba Banners. */
export function TarjaInspector({ previewId, bp, onUpdateBp, onDownloadBenefitsPng }: InspectorTargetProps) {
  return (
    <BenefitsBannerEditor
      variant="inspector"
      previewId={previewId}
      bp={bp}
      onUpdateBp={onUpdateBp}
      onDownloadBenefitsPng={onDownloadBenefitsPng}
    />
  );
}
