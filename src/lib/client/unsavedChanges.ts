import type { StoreBlueprint } from "@/lib/types/blueprint";

/** Campos persistidos pelo "Salvar" do Studio. */
export interface StudioSaveSnapshot {
  bp: StoreBlueprint;
  sellerWhatsapp: string;
  currentMode: string;
}

/** Igualdade estrutural simples para dados JSON (objetos, arrays e primitivos). */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const aKeys = Object.keys(ao).filter((k) => ao[k] !== undefined);
  const bKeys = Object.keys(bo).filter((k) => bo[k] !== undefined);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => deepEqual(ao[k], bo[k]));
}

/**
 * Após um save bem-sucedido, ainda há alterações pendentes se o estado atual
 * (que pode ter sido editado durante a requisição) difere do que foi enviado.
 */
export function computeUnsaved(current: StudioSaveSnapshot, sent: StudioSaveSnapshot): boolean {
  return (
    current.sellerWhatsapp !== sent.sellerWhatsapp ||
    current.currentMode !== sent.currentMode ||
    !deepEqual(current.bp, sent.bp)
  );
}
