import type { SectionKey, StoreBlueprint } from "@/lib/types/blueprint";
import type { InspectorSelection } from "../inspectorTargets";

/** Props recebidas por todo editor de alvo do Inspector (mesmas do ElementInspectorPanel). */
export interface InspectorTargetProps {
  previewId: string;
  bp: StoreBlueprint;
  selection: InspectorSelection;
  onUpdateBp: (updater: (prev: StoreBlueprint) => StoreBlueprint) => void;
  onSelect: (next: InspectorSelection | null) => void;
  onToggleSection: (sectionId: SectionKey) => void;
  onMoveSection: (fromIdx: number, toIdx: number) => void;
  onDownloadBenefitsPng: () => void;
  onShowSlide?: (slideIdx: number) => void;
  /** Rascunho do "adicionar categoria" (fica no despachante para sobreviver à troca de alvo). */
  categoryDraft: string;
  onCategoryDraftChange: (next: string) => void;
}

/** Produto apontado pela seleção "product-item" (null se não houver ou se foi removido). */
export function findSelectedProduct(bp: StoreBlueprint, selection: InspectorSelection) {
  return selection.targetId === "product-item" && selection.productId
    ? bp.products.find((p) => p.id === selection.productId) ?? null
    : null;
}
