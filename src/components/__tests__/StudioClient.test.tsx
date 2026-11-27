// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import StudioClient from "@/components/StudioClient";
import { buildHeuristicBlueprint } from "@/lib/ai/architect";
import { makeSampleExtracted } from "@/lib/__tests__/fixtures";
import type { StoreBlueprint } from "@/lib/types/blueprint";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }) }));

const fetchMock = vi.fn();

beforeEach(() => {
  // jsdom não tem ResizeObserver (StoreCompareView) nem scrollTo em elementos
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  Element.prototype.scrollTo = () => {};
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderStudio() {
  return render(
    <StudioClient
      id="p1"
      slug="loja"
      sourceUrl="https://loja.example.com"
      detectedPlatform="Nuvemshop"
      aiStatus={{ text: true, image: "google" }}
      generationMode="heuristic"
      initialWhatsapp="5511999999999"
      screenshotPath={null}
      fullScreenshotPath={null}
      initialBlueprint={buildHeuristicBlueprint(makeSampleExtracted())}
    />
  );
}

async function click(el: Element) {
  await act(async () => {
    fireEvent.click(el);
  });
}

async function saveAndGetBlueprint(): Promise<StoreBlueprint> {
  await click(screen.getByRole("button", { name: /Salvar Alterações/ }));
  const patch = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
  expect(patch?.[0]).toBe("/api/previews/p1");
  return JSON.parse(patch![1].body).blueprint as StoreBlueprint;
}

describe("StudioClient (fumaça)", () => {
  it("troca entre as abas do editor e do estúdio", async () => {
    renderStudio();
    expect(screen.getByLabelText("Nome da Loja")).toBeTruthy();

    await click(screen.getByRole("tab", { name: /Cores\/Botões/ }));
    expect(screen.getByText("8 Tokens de Cor (Tema LIME)")).toBeTruthy();

    await click(screen.getByRole("tab", { name: /Banners/ }));
    expect(screen.getByText("Slides do Banner Principal")).toBeTruthy();
    expect(screen.getByText("Tarja de Benefícios")).toBeTruthy();

    await click(screen.getByRole("tab", { name: /Seções/ }));
    expect(screen.getByText("Seções da Página Inicial")).toBeTruthy();

    await click(screen.getByRole("tab", { name: /Comparar/ }));
    expect(screen.getByRole("tab", { name: /Comparar/ }).getAttribute("aria-selected")).toBe("true");
    await click(screen.getByRole("tab", { name: /Preview ao Vivo/ }));
    expect(screen.getByTitle("Preview Irroba LIME")).toBeTruthy();
  });

  it("edita um campo, marca alterações não salvas e envia no save", async () => {
    renderStudio();
    expect(screen.queryByText("Alterações não salvas")).toBeNull();

    await act(async () => {
      fireEvent.change(screen.getByLabelText("Nome da Loja"), { target: { value: "Loja Nova" } });
    });
    expect(screen.getByText("Alterações não salvas")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Loja Nova");

    const saved = await saveAndGetBlueprint();
    expect(saved.brand.name).toBe("Loja Nova");
    expect(screen.queryByText("Alterações não salvas")).toBeNull();
  });

  it("desfazer a edição à mão volta a ficar sem alterações pendentes", async () => {
    renderStudio();
    const input = screen.getByLabelText("Nome da Loja") as HTMLInputElement;
    const original = input.value;
    await act(async () => {
      fireEvent.change(input, { target: { value: "Outra" } });
    });
    expect(screen.getByText("Alterações não salvas")).toBeTruthy();
    await act(async () => {
      fireEvent.change(input, { target: { value: original } });
    });
    expect(screen.queryByText("Alterações não salvas")).toBeNull();
  });

  it("adiciona categoria pela aba Seções (CategoryAdder) e salva", async () => {
    renderStudio();
    await click(screen.getByRole("tab", { name: /Seções/ }));
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Nova categoria do menu"), { target: { value: "  Sandálias " } });
    });
    await click(screen.getByRole("button", { name: "Adicionar categoria" }));
    expect((screen.getByLabelText("Nova categoria do menu") as HTMLInputElement).value).toBe("");

    const saved = await saveAndGetBlueprint();
    const added = saved.sections.categories.at(-1)!;
    expect(added.label).toBe("Sandálias");
    expect(added.href).toMatch(/^#cat-/);
  });
});
