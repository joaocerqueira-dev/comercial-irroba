import { describe, expect, it } from "vitest";
import { shareBadgeLabel } from "@/lib/share/badge";

const base = { legacyPublic: false, shareExpiresAt: new Date(Date.now() - 1000) };

describe("shareBadgeLabel expirado", () => {
  it("pendente e vencido: Link expirado", () => {
    expect(shareBadgeLabel({ ...base, shareStatus: "pendente" })).toBe("Link expirado");
  });
  it("aprovada vencida mantém o rótulo", () => {
    expect(shareBadgeLabel({ ...base, shareStatus: "aprovada" })).toBe("Aprovada");
  });
  it("pendente no prazo: Aguardando cliente", () => {
    expect(shareBadgeLabel({ ...base, shareExpiresAt: new Date(Date.now() + 100000), shareStatus: "pendente" })).toBe("Aguardando cliente");
  });
});
