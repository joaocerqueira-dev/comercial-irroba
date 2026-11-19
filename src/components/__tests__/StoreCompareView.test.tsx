// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import StoreCompareView from "@/components/StoreCompareView";

afterEach(cleanup);

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
});
