"use client";

import { Download, Plus, Trash2 } from "lucide-react";
import { AiImageSlot } from "@/components/studio/AiImageSlot";
import { BannerDimensionsControl } from "@/components/studio/BannerDimensionsControl";
import { ColorField } from "@/components/studio/ColorField";
import { Field } from "@/components/ui/Field";
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
      <div className="space-y-3 rounded-xl border border-zinc-200 p-3">
        <BannerDimensionsControl
          title="Tamanho do Banner Principal (PX)"
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
            updateBp((prev) => ({
              ...prev,
              visualOverrides: {
                ...prev.visualOverrides,
                banner: {
                  ...prev.visualOverrides.banner,
                  width: full ? "full" : "container",
                  customWidthPx: full
                    ? undefined
                    : prev.visualOverrides.banner.customWidthPx ?? 1280,
                },
              },
            }))
          }
          objectFit={bp.visualOverrides.banner.objectFit}
          onHeightChange={(h) =>
            updateBp((prev) => ({
              ...prev,
              visualOverrides: {
                ...prev.visualOverrides,
                banner: { ...prev.visualOverrides.banner, heightPx: h },
              },
            }))
          }
          onWidthChange={(w) =>
            updateBp((prev) => ({
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
            updateBp((prev) => ({
              ...prev,
              visualOverrides: {
                ...prev.visualOverrides,
                banner: { ...prev.visualOverrides.banner, objectFit: fit },
              },
            }))
          }
        />

        <div className="flex items-center justify-between">
          <span className="font-bold text-zinc-800">Slides do Banner Principal</span>
          <button
            type="button"
            onClick={() =>
              updateBp((prev) => ({
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
              }))
            }
            className="inline-flex items-center gap-1 rounded-md bg-irroba-ink px-2 py-1 text-xs font-semibold text-white hover:bg-zinc-800"
          >
            <Plus className="h-3 w-3" />
            Slide
          </button>
        </div>

        {bp.sections.heroSlides.map((slide, idx) => (
          <div key={slide.id} className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 font-semibold text-zinc-700">
                <input
                  type="checkbox"
                  checked={slide.enabled}
                  onChange={(e) =>
                    updateBp((prev) => ({
                      ...prev,
                      sections: {
                        ...prev.sections,
                        heroSlides: prev.sections.heroSlides.map((s, i) =>
                          i === idx ? { ...s, enabled: e.target.checked } : s
                        ),
                      },
                    }))
                  }
                />
                Slide {idx + 1}
              </label>
              {bp.sections.heroSlides.length > 1 && (
                <button
                  type="button"
                  aria-label="Remover slide"
                  onClick={() =>
                    updateBp((prev) => ({
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

            <div>
              <Field label="Modo do Banner" labelClassName="mb-1 block text-xs text-zinc-500">
              <select
                value={slide.mode}
                onChange={(e) =>
                  updateBp((prev) => ({
                    ...prev,
                    sections: {
                      ...prev.sections,
                      heroSlides: prev.sections.heroSlides.map((s, i) =>
                        i === idx
                          ? { ...s, mode: e.target.value as "artwork" | "editorial" }
                          : s
                      ),
                    },
                  }))
                }
                className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-zinc-800"
              >
                <option value="artwork">Arte Original (sem texto por cima)</option>
                <option value="editorial">Editorial (título + botão CTA)</option>
              </select>
              </Field>
            </div>

            <AiImageSlot
              previewId={id}
              label={`Imagem do Slide ${idx + 1}`}
              value={slide.imageUrl}
              defaultAspectRatio="16:9"
              minRecommendedWidth={1000}
              onChange={(nextUrl) =>
                updateBp((prev) => ({
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

            {slide.mode === "editorial" && (
              <>
                <input
                  aria-label="Título do banner"
                  type="text"
                  value={slide.headline}
                  placeholder="Título do Banner"
                  onChange={(e) =>
                    updateBp((prev) => ({
                      ...prev,
                      sections: {
                        ...prev.sections,
                        heroSlides: prev.sections.heroSlides.map((s, i) =>
                          i === idx ? { ...s, headline: e.target.value } : s
                        ),
                      },
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-zinc-800"
                />
                <input
                  aria-label="Subtítulo do banner"
                  type="text"
                  value={slide.subheadline}
                  placeholder="Subtítulo"
                  onChange={(e) =>
                    updateBp((prev) => ({
                      ...prev,
                      sections: {
                        ...prev.sections,
                        heroSlides: prev.sections.heroSlides.map((s, i) =>
                          i === idx ? { ...s, subheadline: e.target.value } : s
                        ),
                      },
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-zinc-800"
                />
                <input
                  aria-label="Texto do botão do banner"
                  type="text"
                  value={slide.ctaText}
                  placeholder="Texto do Botão"
                  onChange={(e) =>
                    updateBp((prev) => ({
                      ...prev,
                      sections: {
                        ...prev.sections,
                        heroSlides: prev.sections.heroSlides.map((s, i) =>
                          i === idx ? { ...s, ctaText: e.target.value } : s
                        ),
                      },
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-zinc-800"
                />
              </>
            )}
          </div>
        ))}
      </div>

      {/* Banner de Benefícios (Tarja Informativa) */}
      <div className="space-y-2.5 rounded-xl border border-zinc-200 p-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-bold text-zinc-800">Tarja de Benefícios</span>
            <span className="ml-1.5 rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-semibold text-zinc-600">
              Tarja Informativa
            </span>
          </div>
          <button
            type="button"
            onClick={handleDownloadBenefitsPng}
            className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-2 py-1 text-xs font-bold text-white hover:bg-brand-600"
          >
            <Download className="h-3 w-3" />
            Baixar PNG
          </button>
        </div>
        <select
          aria-label="Formato da tarja de benefícios"
          value={bp.sections.benefitsBanner?.mode ?? "generated-art"}
          onChange={(e) =>
            updateBp((prev) => ({
              ...prev,
              sections: {
                ...prev.sections,
                benefitsBanner: {
                  backgroundColor:
                    prev.sections.benefitsBanner?.backgroundColor ??
                    prev.theme.neutralBackground,
                  textColor:
                    prev.sections.benefitsBanner?.textColor ??
                    prev.theme.neutralForeground,
                  siteImageUrls: prev.sections.benefitsBanner?.siteImageUrls ?? [],
                  ...prev.sections.benefitsBanner,
                  mode: e.target.value as
                    | "site-images"
                    | "custom-image"
                    | "generated-art"
                    | "cards",
                },
              },
            }))
          }
          className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-zinc-800"
        >
          {(bp.sections.benefitsBanner?.siteImageUrls?.length ?? 0) > 0 && (
            <option value="site-images">Artes Extraídas do Site</option>
          )}
          <option value="custom-image">Imagem Única Personalizada / IA</option>
          <option value="generated-art">Arte Banner Gerada (Irroba)</option>
          <option value="cards">Cards Modulares</option>
        </select>

        {/* Controles de dimensionamento da Tarja */}
        <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-700">
            <span>Dimensionamento da Tarja</span>
            <label className="flex items-center gap-1 text-xs font-medium text-zinc-600">
              <input
                type="checkbox"
                checked={Boolean(bp.sections.benefitsBanner?.fullWidth)}
                onChange={(e) =>
                  updateBp((prev) => ({
                    ...prev,
                    sections: {
                      ...prev.sections,
                      benefitsBanner: {
                        mode: prev.sections.benefitsBanner?.mode ?? "generated-art",
                        backgroundColor:
                          prev.sections.benefitsBanner?.backgroundColor ??
                          prev.theme.neutralBackground,
                        textColor:
                          prev.sections.benefitsBanner?.textColor ??
                          prev.theme.neutralForeground,
                        siteImageUrls: prev.sections.benefitsBanner?.siteImageUrls ?? [],
                        ...prev.sections.benefitsBanner,
                        fullWidth: e.target.checked,
                      },
                    },
                  }))
                }
              />
              Largura 100%
            </label>
          </div>

          <div>
            <div className="mb-0.5 flex justify-between text-xs text-zinc-600">
              <span>Altura máxima</span>
              <strong className="font-mono text-zinc-800">
                {bp.sections.benefitsBanner?.maxHeightPx ?? 120}px
              </strong>
            </div>
            <input
              aria-label="Altura máxima da tarja (px)"
              type="range"
              min={36}
              max={260}
              step={4}
              value={bp.sections.benefitsBanner?.maxHeightPx ?? 120}
              onChange={(e) =>
                updateBp((prev) => ({
                  ...prev,
                  sections: {
                    ...prev.sections,
                    benefitsBanner: {
                      mode: prev.sections.benefitsBanner?.mode ?? "generated-art",
                      backgroundColor:
                        prev.sections.benefitsBanner?.backgroundColor ??
                        prev.theme.neutralBackground,
                      textColor:
                        prev.sections.benefitsBanner?.textColor ??
                        prev.theme.neutralForeground,
                      siteImageUrls: prev.sections.benefitsBanner?.siteImageUrls ?? [],
                      ...prev.sections.benefitsBanner,
                      maxHeightPx: Number(e.target.value),
                    },
                  },
                }))
              }
              className="w-full accent-brand-500"
            />
          </div>

          {!bp.sections.benefitsBanner?.fullWidth && (
            <div>
              <div className="mb-0.5 flex justify-between text-xs text-zinc-600">
                <span>Largura máxima</span>
                <strong className="font-mono text-zinc-800">
                  {bp.sections.benefitsBanner?.maxWidthPx ?? 1280}px
                </strong>
              </div>
              <input
                aria-label="Largura máxima da tarja (px)"
                type="range"
                min={640}
                max={1600}
                step={20}
                value={bp.sections.benefitsBanner?.maxWidthPx ?? 1280}
                onChange={(e) =>
                  updateBp((prev) => ({
                    ...prev,
                    sections: {
                      ...prev.sections,
                      benefitsBanner: {
                        mode: prev.sections.benefitsBanner?.mode ?? "generated-art",
                        backgroundColor:
                          prev.sections.benefitsBanner?.backgroundColor ??
                          prev.theme.neutralBackground,
                        textColor:
                          prev.sections.benefitsBanner?.textColor ??
                          prev.theme.neutralForeground,
                        siteImageUrls: prev.sections.benefitsBanner?.siteImageUrls ?? [],
                        ...prev.sections.benefitsBanner,
                        maxWidthPx: Number(e.target.value),
                      },
                    },
                  }))
                }
                className="w-full accent-brand-500"
              />
            </div>
          )}

          <div>
            <div className="mb-0.5 flex justify-between text-xs text-zinc-600">
              <span>Espaçamento vertical</span>
              <strong className="font-mono text-zinc-800">
                {bp.sections.benefitsBanner?.paddingY ?? 14}px
              </strong>
            </div>
            <input
              aria-label="Espaçamento vertical da tarja (px)"
              type="range"
              min={0}
              max={48}
              step={2}
              value={bp.sections.benefitsBanner?.paddingY ?? 14}
              onChange={(e) =>
                updateBp((prev) => ({
                  ...prev,
                  sections: {
                    ...prev.sections,
                    benefitsBanner: {
                      mode: prev.sections.benefitsBanner?.mode ?? "generated-art",
                      backgroundColor:
                        prev.sections.benefitsBanner?.backgroundColor ??
                        prev.theme.neutralBackground,
                      textColor:
                        prev.sections.benefitsBanner?.textColor ??
                        prev.theme.neutralForeground,
                      siteImageUrls: prev.sections.benefitsBanner?.siteImageUrls ?? [],
                      ...prev.sections.benefitsBanner,
                      paddingY: Number(e.target.value),
                    },
                  },
                }))
              }
              className="w-full accent-brand-500"
            />
          </div>
        </div>

        {bp.sections.benefitsBanner?.mode === "custom-image" && (
          <AiImageSlot
            previewId={id}
            label="Imagem da Tarja de Benefícios (21:9)"
            value={bp.sections.benefitsBanner?.customImageUrl ?? ""}
            defaultAspectRatio="21:9"
            minRecommendedWidth={900}
            onChange={(nextUrl) =>
              updateBp((prev) => ({
                ...prev,
                sections: {
                  ...prev.sections,
                  benefitsBanner: {
                    mode: "custom-image",
                    backgroundColor:
                      prev.sections.benefitsBanner?.backgroundColor ??
                      prev.theme.neutralBackground,
                    textColor:
                      prev.sections.benefitsBanner?.textColor ??
                      prev.theme.neutralForeground,
                    siteImageUrls: prev.sections.benefitsBanner?.siteImageUrls ?? [],
                    ...prev.sections.benefitsBanner,
                    customImageUrl: nextUrl,
                  },
                },
              }))
            }
          />
        )}

        <div className="grid grid-cols-2 gap-2">
          <ColorField
            label="Fundo da Faixa"
            value={
              bp.sections.benefitsBanner?.backgroundColor ?? bp.theme.neutralBackground
            }
            onChange={(v) =>
              updateBp((prev) => ({
                ...prev,
                sections: {
                  ...prev.sections,
                  benefitsBanner: {
                    mode: prev.sections.benefitsBanner?.mode ?? "generated-art",
                    textColor:
                      prev.sections.benefitsBanner?.textColor ??
                      prev.theme.neutralForeground,
                    siteImageUrls: prev.sections.benefitsBanner?.siteImageUrls ?? [],
                    ...prev.sections.benefitsBanner,
                    backgroundColor: v,
                  },
                },
              }))
            }
          />
          <ColorField
            label="Texto da Arte"
            value={bp.sections.benefitsBanner?.textColor ?? bp.theme.neutralForeground}
            onChange={(v) =>
              updateBp((prev) => ({
                ...prev,
                sections: {
                  ...prev.sections,
                  benefitsBanner: {
                    mode: prev.sections.benefitsBanner?.mode ?? "generated-art",
                    backgroundColor:
                      prev.sections.benefitsBanner?.backgroundColor ??
                      prev.theme.neutralBackground,
                    siteImageUrls: prev.sections.benefitsBanner?.siteImageUrls ?? [],
                    ...prev.sections.benefitsBanner,
                    textColor: v,
                  },
                },
              }))
            }
          />
        </div>

        {bp.sections.benefitsBanner?.mode !== "site-images" &&
          bp.sections.benefitsBanner?.mode !== "custom-image" && (
            <div className="space-y-1.5 pt-1">
              {bp.sections.benefits.slice(0, 4).map((b, bIdx) => (
                <div key={bIdx} className="grid grid-cols-2 gap-1.5">
                  <input
                    aria-label={`Título do benefício ${bIdx + 1}`}
                    type="text"
                    value={b.title}
                    onChange={(e) =>
                      updateBp((prev) => ({
                        ...prev,
                        sections: {
                          ...prev.sections,
                          benefits: prev.sections.benefits.map((item, idx) =>
                            idx === bIdx ? { ...item, title: e.target.value } : item
                          ),
                        },
                      }))
                    }
                    className="rounded border border-zinc-200 px-2 py-1 text-xs"
                  />
                  <input
                    aria-label={`Subtítulo do benefício ${bIdx + 1}`}
                    type="text"
                    value={b.subtitle}
                    onChange={(e) =>
                      updateBp((prev) => ({
                        ...prev,
                        sections: {
                          ...prev.sections,
                          benefits: prev.sections.benefits.map((item, idx) =>
                            idx === bIdx ? { ...item, subtitle: e.target.value } : item
                          ),
                        },
                      }))
                    }
                    className="rounded border border-zinc-200 px-2 py-1 text-xs"
                  />
                </div>
              ))}
            </div>
          )}
      </div>

      {/* Banner Slim */}
      {bp.sections.slimBanner && (
        <div className="space-y-2.5 rounded-xl border border-zinc-200 p-3">
          <label className="flex items-center justify-between font-bold text-zinc-800">
            <span>Banner Slim Promocional</span>
            <input
              type="checkbox"
              checked={bp.sections.slimBanner.enabled}
              onChange={(e) =>
                updateBp((prev) => ({
                  ...prev,
                  sections: {
                    ...prev.sections,
                    slimBanner: prev.sections.slimBanner
                      ? { ...prev.sections.slimBanner, enabled: e.target.checked }
                      : undefined,
                  },
                }))
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
              updateBp((prev) => ({
                ...prev,
                sections: {
                  ...prev.sections,
                  slimBanner: prev.sections.slimBanner
                    ? { ...prev.sections.slimBanner, heightPx: h }
                    : undefined,
                },
              }))
            }
            onWidthChange={(w) =>
              updateBp((prev) => ({
                ...prev,
                sections: {
                  ...prev.sections,
                  slimBanner: prev.sections.slimBanner
                    ? { ...prev.sections.slimBanner, widthPx: w }
                    : undefined,
                },
              }))
            }
          />
          <select
            aria-label="Modo da faixa"
            value={bp.sections.slimBanner.mode}
            onChange={(e) =>
              updateBp((prev) => ({
                ...prev,
                sections: {
                  ...prev.sections,
                  slimBanner: prev.sections.slimBanner
                    ? {
                        ...prev.sections.slimBanner,
                        mode: e.target.value as "image" | "designed",
                      }
                    : undefined,
                },
              }))
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
                updateBp((prev) => ({
                  ...prev,
                  sections: {
                    ...prev.sections,
                    slimBanner: prev.sections.slimBanner
                      ? { ...prev.sections.slimBanner, imageUrl: nextUrl }
                      : undefined,
                  },
                }))
              }
            />
          ) : (
            <>
              <input
                aria-label="Mensagem da faixa"
                type="text"
                value={bp.sections.slimBanner.headline}
                onChange={(e) =>
                  updateBp((prev) => ({
                    ...prev,
                    sections: {
                      ...prev.sections,
                      slimBanner: prev.sections.slimBanner
                        ? { ...prev.sections.slimBanner, headline: e.target.value }
                        : undefined,
                    },
                  }))
                }
                className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
              />
              <div className="grid grid-cols-2 gap-2">
                <ColorField
                  label="Fundo"
                  value={bp.sections.slimBanner.backgroundColor}
                  onChange={(v) =>
                    updateBp((prev) => ({
                      ...prev,
                      sections: {
                        ...prev.sections,
                        slimBanner: prev.sections.slimBanner
                          ? { ...prev.sections.slimBanner, backgroundColor: v }
                          : undefined,
                      },
                    }))
                  }
                />
                <ColorField
                  label="Texto"
                  value={bp.sections.slimBanner.textColor}
                  onChange={(v) =>
                    updateBp((prev) => ({
                      ...prev,
                      sections: {
                        ...prev.sections,
                        slimBanner: prev.sections.slimBanner
                          ? { ...prev.sections.slimBanner, textColor: v }
                          : undefined,
                      },
                    }))
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
                updateBp((prev) => ({
                  ...prev,
                  sections: {
                    ...prev.sections,
                    secondaryBanner: prev.sections.secondaryBanner
                      ? { ...prev.sections.secondaryBanner, enabled: e.target.checked }
                      : undefined,
                  },
                }))
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
              updateBp((prev) => ({
                ...prev,
                sections: {
                  ...prev.sections,
                  secondaryBanner: prev.sections.secondaryBanner
                    ? { ...prev.sections.secondaryBanner, heightPx: h }
                    : undefined,
                },
              }))
            }
            onWidthChange={(w) =>
              updateBp((prev) => ({
                ...prev,
                sections: {
                  ...prev.sections,
                  secondaryBanner: prev.sections.secondaryBanner
                    ? { ...prev.sections.secondaryBanner, widthPx: w }
                    : undefined,
                },
              }))
            }
            onObjectFitChange={(fit) =>
              updateBp((prev) => ({
                ...prev,
                sections: {
                  ...prev.sections,
                  secondaryBanner: prev.sections.secondaryBanner
                    ? { ...prev.sections.secondaryBanner, objectFit: fit }
                    : undefined,
                },
              }))
            }
          />
          <select
            aria-label="Modo do banner secundário"
            value={bp.sections.secondaryBanner.mode}
            onChange={(e) =>
              updateBp((prev) => ({
                ...prev,
                sections: {
                  ...prev.sections,
                  secondaryBanner: prev.sections.secondaryBanner
                    ? {
                        ...prev.sections.secondaryBanner,
                        mode: e.target.value as "artwork" | "editorial",
                      }
                    : undefined,
                },
              }))
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
              updateBp((prev) => ({
                ...prev,
                sections: {
                  ...prev.sections,
                  secondaryBanner: prev.sections.secondaryBanner
                    ? { ...prev.sections.secondaryBanner, imageUrl: nextUrl }
                    : undefined,
                },
              }))
            }
          />
          {bp.sections.secondaryBanner.mode === "editorial" && (
            <>
              <input
                aria-label="Título do banner secundário"
                type="text"
                value={bp.sections.secondaryBanner.headline}
                onChange={(e) =>
                  updateBp((prev) => ({
                    ...prev,
                    sections: {
                      ...prev.sections,
                      secondaryBanner: prev.sections.secondaryBanner
                        ? { ...prev.sections.secondaryBanner, headline: e.target.value }
                        : undefined,
                    },
                  }))
                }
                className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
              />
              <input
                aria-label="Texto do botão do banner secundário"
                type="text"
                value={bp.sections.secondaryBanner.ctaText}
                onChange={(e) =>
                  updateBp((prev) => ({
                    ...prev,
                    sections: {
                      ...prev.sections,
                      secondaryBanner: prev.sections.secondaryBanner
                        ? { ...prev.sections.secondaryBanner, ctaText: e.target.value }
                        : undefined,
                    },
                  }))
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
                  updateBp((prev) => ({
                    ...prev,
                    sections: {
                      ...prev.sections,
                      moodBanners: prev.sections.moodBanners.map((item, i) =>
                        i === idx ? { ...item, enabled: e.target.checked } : item
                      ),
                    },
                  }))
                }
              />
            </label>
            <input
              aria-label={`Título da coleção ${idx + 1}`}
              type="text"
              value={m.title}
              onChange={(e) =>
                updateBp((prev) => ({
                  ...prev,
                  sections: {
                    ...prev.sections,
                    moodBanners: prev.sections.moodBanners.map((item, i) =>
                      i === idx ? { ...item, title: e.target.value } : item
                    ),
                  },
                }))
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
                updateBp((prev) => ({
                  ...prev,
                  sections: {
                    ...prev.sections,
                    moodBanners: prev.sections.moodBanners.map((item, i) =>
                      i === idx ? { ...item, imageUrl: nextUrl } : item
                    ),
                  },
                }))
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
