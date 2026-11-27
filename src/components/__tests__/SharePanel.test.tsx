// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SharePanel } from "@/components/studio/SharePanel";

const fetchMock = vi.fn();
const state = {
  shareExpiresAt: null,
  hasPassword: false,
  legacyPublic: false,
  shareStatus: "pendente",
  contentVersion: 3,
  responses: [
    { id: "r1", type: "ajustes", clientName: "Ana", message: "Trocar banner", contentVersion: 2, createdAt: "2026-11-20T15:30:00.000Z", seenAt: null },
  ],
};

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (_url: string, init?: RequestInit) => {
    if (init?.method === "PUT")
      return { ok: true, json: async () => ({ url: "/preview/loja", expiresAt: "2026-12-12T00:00:00Z", password: "abc-123" }) };
    if (init?.method === "DELETE") return { ok: true, json: async () => ({ ok: true }) };
    return { ok: true, json: async () => state };
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const calls = (m: string) => fetchMock.mock.calls.filter((c) => (c[1]?.method ?? "GET") === m);

describe("SharePanel", () => {
  it("carrega o estado e mostra o histórico de respostas", async () => {
    render(<SharePanel previewId="p1" slug="loja" />);
    expect(await screen.findByText(/Ajustes pedidos por Ana/)).toBeTruthy();
    expect(screen.getByText("Trocar banner")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Copiar link" }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: "Copiar link e senha" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("salvar com 15 dias faz PUT { days: 15 } e mostra link e senha", async () => {
    render(<SharePanel previewId="p1" slug="loja" />);
    await screen.findByText(/Ajustes pedidos por Ana/);
    fireEvent.click(screen.getByLabelText("15 dias"));
    fireEvent.click(screen.getByRole("button", { name: "Salvar link" }));
    expect(await screen.findByText("abc-123")).toBeTruthy();
    const put = calls("PUT")[0];
    expect(put[0]).toBe("/api/previews/p1/share");
    expect(JSON.parse(put[1].body)).toEqual({ days: 15 });
    expect(screen.getByText(/\/preview\/loja/)).toBeTruthy();
    expect(screen.getByText("A senha só aparece agora. Para trocar, salve uma nova.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Copiar link e senha" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("Desativar link faz DELETE", async () => {
    render(<SharePanel previewId="p1" slug="loja" />);
    await screen.findByText(/Ajustes pedidos por Ana/);
    fireEvent.click(screen.getByRole("button", { name: "Desativar link" }));
    await waitFor(() => expect(calls("DELETE")).toHaveLength(1));
  });
});
