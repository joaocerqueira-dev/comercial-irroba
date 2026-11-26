import type { StoreBlueprint } from "@/lib/types/blueprint";

/**
 * Atualizadores de blueprint compartilhados pela aba Banners e pelo Inspector.
 * Cada função devolve o `updater` passado a `updateBp`/`onUpdateBp`.
 */
type Sections = StoreBlueprint["sections"];
type HeroSlide = Sections["heroSlides"][number];
type BenefitsBanner = NonNullable<Sections["benefitsBanner"]>;
type SlimBanner = NonNullable<Sections["slimBanner"]>;
type SecondaryBanner = NonNullable<Sections["secondaryBanner"]>;
type MoodBanner = Sections["moodBanners"][number];
type Benefit = Sections["benefits"][number];
type Updater = (prev: StoreBlueprint) => StoreBlueprint;

export const patchHeroSlide =
  (idx: number, patch: Partial<HeroSlide>): Updater =>
  (prev) => ({
    ...prev,
    sections: {
      ...prev.sections,
      heroSlides: prev.sections.heroSlides.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    },
  });

/**
 * Mescla `patch` na tarja de benefícios, criando-a com os padrões do tema se ainda não existir
 * (o modo padrão é "generated-art", ou `defaultMode` quando informado).
 */
export const patchBenefitsBanner =
  (patch: Partial<BenefitsBanner>, defaultMode: BenefitsBanner["mode"] = "generated-art"): Updater =>
  (prev) => ({
    ...prev,
    sections: {
      ...prev.sections,
      benefitsBanner: {
        mode: prev.sections.benefitsBanner?.mode ?? defaultMode,
        backgroundColor: prev.sections.benefitsBanner?.backgroundColor ?? prev.theme.neutralBackground,
        textColor: prev.sections.benefitsBanner?.textColor ?? prev.theme.neutralForeground,
        siteImageUrls: prev.sections.benefitsBanner?.siteImageUrls ?? [],
        ...prev.sections.benefitsBanner,
        ...patch,
      },
    },
  });

export const patchBenefit =
  (bIdx: number, patch: Partial<Benefit>): Updater =>
  (prev) => ({
    ...prev,
    sections: {
      ...prev.sections,
      benefits: prev.sections.benefits.map((item, idx) => (idx === bIdx ? { ...item, ...patch } : item)),
    },
  });

/** Mescla `patch` no banner slim, se ele existir. */
export const patchSlimBanner =
  (patch: Partial<SlimBanner>): Updater =>
  (prev) => ({
    ...prev,
    sections: {
      ...prev.sections,
      slimBanner: prev.sections.slimBanner ? { ...prev.sections.slimBanner, ...patch } : undefined,
    },
  });

/** Mescla `patch` no banner secundário, se ele existir. */
export const patchSecondaryBanner =
  (patch: Partial<SecondaryBanner>): Updater =>
  (prev) => ({
    ...prev,
    sections: {
      ...prev.sections,
      secondaryBanner: prev.sections.secondaryBanner
        ? { ...prev.sections.secondaryBanner, ...patch }
        : undefined,
    },
  });

export const patchMoodBanner =
  (idx: number, patch: Partial<MoodBanner>): Updater =>
  (prev) => ({
    ...prev,
    sections: {
      ...prev.sections,
      moodBanners: prev.sections.moodBanners.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    },
  });
