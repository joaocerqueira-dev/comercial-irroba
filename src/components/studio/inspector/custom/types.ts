import type { CustomSection } from "@/lib/types/blueprint";

/** Aplica uma alteração na seção personalizada ativa (sincroniza título/módulo no layout). */
export type CustomSectionUpdater = (updater: (cs: CustomSection) => CustomSection) => void;
