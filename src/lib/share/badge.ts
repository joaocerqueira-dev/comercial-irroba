export interface ShareBadgeInput {
  shareStatus: string;
  legacyPublic: boolean;
  shareExpiresAt: string | Date | null;
}

const BY_STATUS: Record<string, string> = {
  aprovada: "Aprovada",
  ajustes: "Ajustes pedidos",
  recusada: "Recusada",
};

/** Rótulo do selo de compartilhamento (lista e painel). */
export function shareBadgeLabel(s: ShareBadgeInput): string {
  if (!s.legacyPublic && !s.shareExpiresAt) return "Link desativado";
  if (BY_STATUS[s.shareStatus]) return BY_STATUS[s.shareStatus];
  if (s.shareExpiresAt && new Date(s.shareExpiresAt) <= new Date()) return "Link expirado";
  return s.legacyPublic ? "Link público (antigo)" : "Aguardando cliente";
}
