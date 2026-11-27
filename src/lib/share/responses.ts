export type ResponseType = "aprovar" | "ajustes" | "recusar";

export const STATUS_BY_RESPONSE: Record<ResponseType, "aprovada" | "ajustes" | "recusada"> = {
  aprovar: "aprovada",
  ajustes: "ajustes",
  recusar: "recusada",
};

export function buildWhatsappLink(
  sellerWhatsapp: string | null,
  type: ResponseType,
  storeName: string,
  message?: string | null
): string | null {
  const digits = (sellerWhatsapp ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const text =
    type === "aprovar"
      ? `Aprovei a proposta da loja ${storeName}`
      : type === "recusar"
        ? `Recusei a proposta da loja ${storeName}`
        : `Pedi ajustes na proposta da loja ${storeName}: ${message ?? ""}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

const LABEL: Record<ResponseType, string> = {
  aprovar: "Aprovada por",
  ajustes: "Ajustes pedidos por",
  recusar: "Recusada por",
};

export function formatResponseStatus(r: { type: ResponseType; clientName: string; createdAt: Date }): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(r.createdAt)
      .map((x) => [x.type, x.value])
  );
  return `${LABEL[r.type]} ${r.clientName} em ${p.day}/${p.month} às ${p.hour}h${p.minute}`;
}
