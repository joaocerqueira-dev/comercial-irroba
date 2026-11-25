"use client";

import type { ChangeEvent } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import type { StoreBlueprint } from "@/lib/types/blueprint";
import { Field } from "@/components/ui/Field";
import { AiImageSlot } from "../AiImageSlot";
import { BannerDimensionsControl } from "../BannerDimensionsControl";
import { ColorField } from "../ColorField";
import { patchBenefit, patchBenefitsBanner, patchHeroSlide } from "./bannerUpdaters";

/**
 * Editores de banner compartilhados pela aba Banners ("tab") e pelo Inspector ("inspector").
 * A lógica de edição é a mesma; a variante só muda textos, classes e os controles extras de
 * cada contexto (o Inspector navega pelos slides na prévia e edita as artes extraídas da tarja;
 * a aba tem os ajustes de largura e espaçamento da tarja).
 */
export type BannerEditorVariant = "tab" | "inspector";

interface BannerEditorBaseProps {
  variant: BannerEditorVariant;
  previewId: string;
  bp: StoreBlueprint;
  onUpdateBp: (updater: (prev: StoreBlueprint) => StoreBlueprint) => void;
}

interface HeroBannerEditorProps extends BannerEditorBaseProps {
  /** Slide em destaque (Inspector). */
  activeSlideIdx?: number;
  /** Mostra o slide na prévia (Inspector). */
  onShowSlide?: (slideIdx: number) => void;
}

/** Banner principal: dimensões e slides do carrossel. */
export function HeroBannerEditor({
  variant,
  previewId,
  bp,
  onUpdateBp,
  activeSlideIdx,
  onShowSlide,
}: HeroBannerEditorProps) {
  const isInspector = variant === "inspector";

  const editorialFields = (slide: StoreBlueprint["sections"]["heroSlides"][number], idx: number) => {
    const headline = (
      <input
        aria-label="Título do banner"
        type="text"
        value={slide.headline}
        placeholder="Título do Banner"
        onChange={(e) => onUpdateBp(patchHeroSlide(idx, { headline: e.target.value }))}
        className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-zinc-800"
      />
    );
    const subheadline = (
      <input
        aria-label="Subtítulo do banner"
        type="text"
        value={slide.subheadline}
        placeholder="Subtítulo"
        onChange={(e) => onUpdateBp(patchHeroSlide(idx, { subheadline: e.target.value }))}
        className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-zinc-800"
      />
    );
    const ctaText = (
      <input
        aria-label="Texto do botão do banner"
        type="text"
        value={slide.ctaText}
        placeholder="Texto do Botão"
        onChange={(e) => onUpdateBp(patchHeroSlide(idx, { ctaText: e.target.value }))}
        className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-zinc-800"
      />
    );

    if (!isInspector) {
      return (
        <>
          {headline}
          {subheadline}
          {ctaText}
        </>
      );
    }
    return (
      <div className="space-y-1.5">
        {headline}
        {subheadline}
        <div className="grid grid-cols-2 gap-1.5">
          {ctaText}
          <input
            aria-label="Link do botão do banner"
            type="text"
            value={slide.ctaHref}
            placeholder="Link (#vitrines)"
            onChange={(e) => onUpdateBp(patchHeroSlide(idx, { ctaHref: e.target.value }))}
            className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-zinc-800"
          />
        </div>
      </div>
    );
  };

  const modeSelect = (slide: StoreBlueprint["sections"]["heroSlides"][number], idx: number) => {
    const onChange = (e: ChangeEvent<HTMLSelectElement>) =>
      onUpdateBp(patchHeroSlide(idx, { mode: e.target.value as "artwork" | "editorial" }));
    const className = "w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-zinc-800";

    if (isInspector) {
      return (
        <select aria-label="Modo do slide" value={slide.mode} onChange={onChange} className={className}>
          <option value="artwork">Arte Original (sem texto sobreposto)</option>
          <option value="editorial">Editorial (título + subtítulo + botão CTA)</option>
        </select>
      );
    }
    return (
      <div>
        <Field label="Modo do Banner" labelClassName="mb-1 block text-xs text-zinc-500">
          <select value={slide.mode} onChange={onChange} className={className}>
            <option value="artwork">Arte Original (sem texto por cima)</option>
            <option value="editorial">Editorial (título + botão CTA)</option>
          </select>
        </Field>
      </div>
    );
  };

  return (
    <div
      className={`space-y-3 rounded-xl border border-zinc-200 ${isInspector ? "bg-white " : ""}p-3`}
    >
      <BannerDimensionsControl
        title={
          isInspector ? "Tamanho de Exibição do Banner Principal (PX)" : "Tamanho do Banner Principal (PX)"
        }
        heightPx={bp.visualOverrides.banner.heightPx}
        defaultHeightPx={500}
        minHeightPx={160}
        maxHeightPx={1100}
        widthPx={
          bp.visualOverrides.banner.customWidthPx ??
          (bp.visualOverrides.banner.width === "container" ? 1280 : undefined)
        }
        defaultWidthPx={1280}
        isFullWidth={
          bp.visualOverrides.banner.width === "full" &&
          bp.visualOverrides.banner.customWidthPx === undefined
        }
        onFullWidthChange={(full) =>
          onUpdateBp((prev) => ({
            ...prev,
            visualOverrides: {
              ...prev.visualOverrides,
              banner: {
                ...prev.visualOverrides.banner,
                width: full ? "full" : "container",
                customWidthPx: full ? undefined : prev.visualOverrides.banner.customWidthPx ?? 1280,
              },
            },
          }))
        }
        objectFit={bp.visualOverrides.banner.objectFit}
        onHeightChange={(h) =>
          onUpdateBp((prev) => ({
            ...prev,
            visualOverrides: {
              ...prev.visualOverrides,
              banner: { ...prev.visualOverrides.banner, heightPx: h },
            },
          }))
        }
        onWidthChange={(w) =>
          onUpdateBp((prev) => ({
            ...prev,
            visualOverrides: {
              ...prev.visualOverrides,
              banner: {
                ...prev.visualOverrides.banner,
                width: w ? "container" : "full",
                customWidthPx: w,
              },
            },
          }))
        }
        onObjectFitChange={(fit) =>
          onUpdateBp((prev) => ({
            ...prev,
            visualOverrides: {
              ...prev.visualOverrides,
              banner: { ...prev.visualOverrides.banner, objectFit: fit },
            },
          }))
        }
      />

      <div className={`flex items-center justify-between${isInspector ? " gap-2" : ""}`}>
        <span className="font-bold text-zinc-800">Slides do Banner Principal</span>
        <button
          type="button"
          onClick={() => {
            const nextIdx = bp.sections.heroSlides.length;
            onUpdateBp((prev) => ({
              ...prev,
              sections: {
                ...prev.sections,
                heroSlides: [
                  ...prev.sections.heroSlides,
                  {
                    id: `slide-${Date.now()}`,
                    imageUrl: prev.sections.hero.imageUrl,
                    headline: `Novidades ${prev.brand.name}`,
                    subheadline: "Confira os lançamentos exclusivos da temporada.",
                    ctaText: "Ver Coleção",
                    ctaHref: "#vitrines",
                    mode: "editorial",
                    enabled: true,
                  },
                ],
              },
            }));
            if (isInspector) onShowSlide?.(nextIdx);
          }}
          className={
            isInspector
              ? "inline-flex items-center gap-1 rounded-lg bg-irroba-ink px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
              : "inline-flex items-center gap-1 rounded-md bg-irroba-ink px-2 py-1 text-xs font-semibold text-white hover:bg-zinc-800"
          }
        >
          <Plus className={isInspector ? "h-3.5 w-3.5" : "h-3 w-3"} />
          {isInspector ? "Novo Slide" : "Slide"}
        </button>
      </div>

      {bp.sections.heroSlides.map((slide, idx) => (
        <div
          key={slide.id}
          onClick={isInspector ? () => onShowSlide?.(idx) : undefined}
          className={
            isInspector
              ? `space-y-2 rounded-lg border p-2.5 transition ${
                  activeSlideIdx === idx ? "border-brand-400 bg-brand-50/50" : "border-zinc-200 bg-zinc-50"
                }`
              : "space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5"
          }
        >
          <div className="flex items-center justify-between">
            <label
              className={`flex items-center gap-1.5 font-semibold ${isInspector ? "text-zinc-800" : "text-zinc-700"}`}
            >
              <input
                type="checkbox"
                checked={slide.enabled}
                onChange={(e) => onUpdateBp(patchHeroSlide(idx, { enabled: e.target.checked }))}
              />
              Slide {idx + 1}
            </label>
            {bp.sections.heroSlides.length > 1 && (
              <button
                type="button"
                aria-label="Remover slide"
                onClick={() =>
                  onUpdateBp((prev) => ({
                    ...prev,
                    sections: {
                      ...prev.sections,
                      heroSlides: prev.sections.heroSlides.filter((_, i) => i !== idx),
                    },
                  }))
                }
                className="text-zinc-400 hover:text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {modeSelect(slide, idx)}

          <AiImageSlot
            previewId={previewId}
            label={`Imagem do Slide ${idx + 1}`}
            value={slide.imageUrl}
            defaultAspectRatio="16:9"
            minRecommendedWidth={1000}
            onChange={(nextUrl) =>
              onUpdateBp((prev) => ({
                ...prev,
                sections: {
                  ...prev.sections,
                  hero: idx === 0 ? { ...prev.sections.hero, imageUrl: nextUrl } : prev.sections.hero,
                  heroSlides: prev.sections.heroSlides.map((s, i) =>
                    i === idx ? { ...s, imageUrl: nextUrl } : s
                  ),
                },
              }))
            }
          />

          {slide.mode === "editorial" && editorialFields(slide, idx)}
        </div>
      ))}
    </div>
  );
}

interface BenefitsBannerEditorProps extends BannerEditorBaseProps {
  onDownloadBenefitsPng: () => void;
}

/** Slider da tarja (altura, largura ou espaçamento), com o valor atual ao lado do rótulo. */
function TarjaRange({
  label,
  ariaLabel,
  value,
  min,
  max,
  step,
  rowClassName,
  onChange,
}: {
  label: string;
  ariaLabel: string;
  value: number;
  min: number;
  max: number;
  step: number;
  rowClassName: string;
  onChange: (next: number) => void;
}) {
  return (
    <div>
      <div className={rowClassName}>
        <span>{label}</span>
        <strong className="font-mono text-zinc-800">{value}px</strong>
      </div>
      <input
        aria-label={ariaLabel}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-500"
      />
    </div>
  );
}

/** Tarja informativa (benefícios): formato, dimensões, cores e textos. */
export function BenefitsBannerEditor({
  variant,
  previewId,
  bp,
  onUpdateBp,
  onDownloadBenefitsPng,
}: BenefitsBannerEditorProps) {
  const isInspector = variant === "inspector";
  const benefitsBanner = bp.sections.benefitsBanner;
  const rangeRowClassName = isInspector
    ? "mb-0.5 flex justify-between text-zinc-600"
    : "mb-0.5 flex justify-between text-xs text-zinc-600";

  const downloadButton = (
    <button
      type="button"
      onClick={onDownloadBenefitsPng}
      className={`inline-flex items-center gap-1 ${isInspector ? "rounded-md" : "rounded-lg"} bg-brand-500 px-2 py-1 text-xs font-bold text-white hover:bg-brand-600`}
    >
      <Download className="h-3 w-3" />
      Baixar PNG
    </button>
  );

  const modeSelect = (
    <select
      aria-label={isInspector ? "Formato da tarja" : "Formato da tarja de benefícios"}
      value={benefitsBanner?.mode ?? "generated-art"}
      onChange={(e) =>
        onUpdateBp(
          patchBenefitsBanner({
            mode: e.target.value as "site-images" | "custom-image" | "generated-art" | "cards",
          })
        )
      }
      className={
        isInspector
          ? "w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-zinc-800"
          : "w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-zinc-800"
      }
    >
      {(benefitsBanner?.siteImageUrls?.length ?? 0) > 0 && (
        <option value="site-images">
          {isInspector ? "Artes Extraídas / Enviadas (Múltiplas)" : "Artes Extraídas do Site"}
        </option>
      )}
      <option value="custom-image">
        {isInspector ? "Imagem Única do Computador / IA" : "Imagem Única Personalizada / IA"}
      </option>
      <option value="generated-art">Arte Banner Gerada (Irroba)</option>
      <option value="cards">{isInspector ? "Cards Modulares Editáveis" : "Cards Modulares"}</option>
    </select>
  );

  const customImage = benefitsBanner?.mode === "custom-image" && (
    <AiImageSlot
      previewId={previewId}
      label={
        isInspector
          ? "Imagem da Tarja (Envie do computador ou gere com IA)"
          : "Imagem da Tarja de Benefícios (21:9)"
      }
      value={benefitsBanner?.customImageUrl ?? ""}
      defaultAspectRatio="21:9"
      minRecommendedWidth={900}
      onChange={(nextUrl) => onUpdateBp(patchBenefitsBanner({ customImageUrl: nextUrl }, "custom-image"))}
    />
  );

  const siteImages = isInspector && benefitsBanner?.mode === "site-images" && (
    <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-zinc-700">Imagens dos Benefícios</span>
        {(benefitsBanner.siteImageUrls?.length ?? 0) < 6 && (
          <button
            type="button"
            onClick={() =>
              onUpdateBp((prev) => ({
                ...prev,
                sections: {
                  ...prev.sections,
                  benefitsBanner: {
                    ...prev.sections.benefitsBanner!,
                    siteImageUrls: [...(prev.sections.benefitsBanner?.siteImageUrls ?? []), ""],
                  },
                },
              }))
            }
            className="inline-flex items-center gap-1 rounded bg-irroba-ink px-2 py-0.5 text-xs font-semibold text-white"
          >
            <Plus className="h-3 w-3" /> Item
          </button>
        )}
      </div>
      {benefitsBanner.siteImageUrls.map((url, idx) => (
        <AiImageSlot
          key={idx}
          previewId={previewId}
          label={`Arte Benefício ${idx + 1}`}
          value={url}
          defaultAspectRatio="1:1"
          minRecommendedWidth={0}
          fit="contain"
          allowAi={false}
          allowClear
          onChange={(nextUrl) =>
            onUpdateBp((prev) => {
              const prevUrls = prev.sections.benefitsBanner?.siteImageUrls ?? [];
              const nextUrls = nextUrl
                ? prevUrls.map((u, i) => (i === idx ? nextUrl : u))
                : prevUrls.filter((_, i) => i !== idx);
              return {
                ...prev,
                sections: {
                  ...prev.sections,
                  benefitsBanner: {
                    ...prev.sections.benefitsBanner!,
                    siteImageUrls: nextUrls,
                  },
                },
              };
            })
          }
        />
      ))}
    </div>
  );

  const dimensions = (
    <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5">
      <div
        className={
          isInspector
            ? "flex items-center justify-between font-semibold text-zinc-700"
            : "flex items-center justify-between text-xs font-semibold text-zinc-700"
        }
      >
        <span>{isInspector ? "Dimensionamento" : "Dimensionamento da Tarja"}</span>
        <label
          className={
            isInspector
              ? "flex items-center gap-1 font-medium text-zinc-600"
              : "flex items-center gap-1 text-xs font-medium text-zinc-600"
          }
        >
          <input
            type="checkbox"
            checked={Boolean(benefitsBanner?.fullWidth)}
            onChange={(e) => onUpdateBp(patchBenefitsBanner({ fullWidth: e.target.checked }))}
          />
          Largura 100%
        </label>
      </div>

      <TarjaRange
        label="Altura máxima"
        ariaLabel="Altura máxima da tarja (px)"
        value={benefitsBanner?.maxHeightPx ?? 120}
        min={36}
        max={260}
        step={4}
        rowClassName={rangeRowClassName}
        onChange={(v) => onUpdateBp(patchBenefitsBanner({ maxHeightPx: v }))}
      />

      {!isInspector && !benefitsBanner?.fullWidth && (
        <TarjaRange
          label="Largura máxima"
          ariaLabel="Largura máxima da tarja (px)"
          value={benefitsBanner?.maxWidthPx ?? 1280}
          min={640}
          max={1600}
          step={20}
          rowClassName={rangeRowClassName}
          onChange={(v) => onUpdateBp(patchBenefitsBanner({ maxWidthPx: v }))}
        />
      )}

      {!isInspector && (
        <TarjaRange
          label="Espaçamento vertical"
          ariaLabel="Espaçamento vertical da tarja (px)"
          value={benefitsBanner?.paddingY ?? 14}
          min={0}
          max={48}
          step={2}
          rowClassName={rangeRowClassName}
          onChange={(v) => onUpdateBp(patchBenefitsBanner({ paddingY: v }))}
        />
      )}
    </div>
  );

  const colors = (
    <div className="grid grid-cols-2 gap-2">
      <ColorField
        label="Fundo da Faixa"
        value={benefitsBanner?.backgroundColor ?? bp.theme.neutralBackground}
        onChange={(v) => onUpdateBp(patchBenefitsBanner({ backgroundColor: v }))}
      />
      <ColorField
        label="Texto da Arte"
        value={benefitsBanner?.textColor ?? bp.theme.neutralForeground}
        onChange={(v) => onUpdateBp(patchBenefitsBanner({ textColor: v }))}
      />
    </div>
  );

  const benefitInputClassName = isInspector
    ? "rounded border border-zinc-200 px-2 py-1"
    : "rounded border border-zinc-200 px-2 py-1 text-xs";
  const benefitTexts = benefitsBanner?.mode !== "site-images" && benefitsBanner?.mode !== "custom-image" && (
    <div className="space-y-1.5 pt-1">
      {isInspector && <div className="font-semibold text-zinc-700">Textos dos Benefícios</div>}
      {bp.sections.benefits.slice(0, 4).map((b, bIdx) => (
        <div key={bIdx} className="grid grid-cols-2 gap-1.5">
          <input
            aria-label={`Título do benefício ${bIdx + 1}`}
            type="text"
            value={b.title}
            onChange={(e) => onUpdateBp(patchBenefit(bIdx, { title: e.target.value }))}
            className={benefitInputClassName}
          />
          <input
            aria-label={`Subtítulo do benefício ${bIdx + 1}`}
            type="text"
            value={b.subtitle}
            onChange={(e) => onUpdateBp(patchBenefit(bIdx, { subtitle: e.target.value }))}
            className={benefitInputClassName}
          />
        </div>
      ))}
    </div>
  );

  if (isInspector) {
    return (
      <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-zinc-800">Formato da Tarja</span>
          {downloadButton}
        </div>
        {modeSelect}
        {customImage}
        {siteImages}
        {dimensions}
        {colors}
        {benefitTexts}
      </div>
    );
  }

  return (
    <div className="space-y-2.5 rounded-xl border border-zinc-200 p-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-bold text-zinc-800">Tarja de Benefícios</span>
          <span className="ml-1.5 rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-semibold text-zinc-600">
            Tarja Informativa
          </span>
        </div>
        {downloadButton}
      </div>
      {modeSelect}
      {dimensions}
      {customImage}
      {colors}
      {benefitTexts}
    </div>
  );
}
