// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import StoreCompareView from "@/components/StoreCompareView";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// jsdom não implementa ResizeObserver
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

describe("StoreCompareView", () => {
  it("renderiza as duas colunas e alterna a sincronização", () => {
    render(
      <StoreCompareView
        storeName="Loja X"
        sourceUrl="https://loja.com.br"
        detectedPlatform="Nuvemshop"
        fullScreenshotPath="/api/captures/x-full.jpg"
        screenshotPath="/api/captures/x.png"
        proposalSrcDoc="<html><body>ok</body></html>"
      />
    );
    expect(screen.getByAltText(/Página completa atual de Loja X/)).toBeTruthy();
    const toggle = screen.getByText("Rolagem Sincronizada");
    fireEvent.click(toggle);
    expect(screen.getByText("Rolagem Independente")).toBeTruthy();
  });

  it("permite alternar entre Desktop e Mobile no comparativo e busca a captura mobile em cache (público)", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        mobileFullScreenshotPath: "/api/captures/loja-x-mobile-full.jpg",
        mobileScreenshotPath: "/api/captures/loja-x-mobile.png",
      }),
    } as Response);

    render(
      <StoreCompareView
        slug="loja-x-123456"
        storeName="Loja X"
        sourceUrl="https://loja.com.br"
        detectedPlatform="Nuvemshop"
        fullScreenshotPath="/api/captures/x-full.jpg"
        screenshotPath="/api/captures/x.png"
        proposalSrcDoc="<html><body>ok</body></html>"
      />
    );

    const desktopBtn = screen.getByRole("button", { name: "Desktop" });
    const mobileBtn = screen.getByRole("button", { name: "Mobile" });
    expect(desktopBtn.getAttribute("aria-pressed")).toBe("true");
    expect(mobileBtn.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(mobileBtn);
    expect(mobileBtn.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(/Mobile 390px/)).toBeTruthy();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/captures/mobile/loja-x-123456",
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
      // Preview público: só GET de cache, nunca POST
      expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBeUndefined();
      const mobileImg = screen.getByAltText(/Página mobile atual de Loja X/) as HTMLImageElement;
      expect(mobileImg.getAttribute("src")).toBe("/api/captures/loja-x-mobile-full.jpg");
    });

    fireEvent.click(desktopBtn);
    expect(desktopBtn.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByAltText(/Página completa atual de Loja X/)).toBeTruthy();
  });

  it("no preview público, sem cache, não oferece recaptura nem chama a rota autenticada", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: false, status: 404, json: async () => ({}) } as Response);
    render(
      <StoreCompareView
        slug="loja-x-123456"
        storeName="Loja X"
        sourceUrl="https://loja.com.br"
        detectedPlatform="Nuvemshop"
        fullScreenshotPath="/api/captures/x-full.jpg"
        screenshotPath="/api/captures/x.png"
        proposalSrcDoc="<html><body>ok</body></html>"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Mobile" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/captures/mobile/loja-x-123456");
    expect(screen.queryByText("Recapturar Mobile")).toBeNull();
    expect(screen.queryByText("Tentar captura mobile")).toBeNull();
  });

  it("no Studio, sem cache, captura pela rota autenticada do preview", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ mobileFullScreenshotPath: "/api/captures/loja-x-mobile-full.jpg" }),
      } as Response);
    render(
      <StoreCompareView
        slug="loja-x-123456"
        previewId="prev-1"
        storeName="Loja X"
        sourceUrl="https://loja.com.br"
        detectedPlatform="Nuvemshop"
        fullScreenshotPath="/api/captures/x-full.jpg"
        screenshotPath="/api/captures/x.png"
        proposalSrcDoc="<html><body>ok</body></html>"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Mobile" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/previews/prev-1/mobile-capture",
        expect.objectContaining({ method: "POST", signal: expect.any(AbortSignal) })
      );
      const mobileImg = screen.getByAltText(/Página mobile atual de Loja X/) as HTMLImageElement;
      expect(mobileImg.getAttribute("src")).toBe("/api/captures/loja-x-mobile-full.jpg");
    });
  });
});
