// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Field } from "@/components/ui/Field";
import { useTabs } from "@/components/ui/useTabs";
import { ElementInspectorPanel } from "@/components/studio/ElementInspectorPanel";
import { AnnouncementBarControls } from "@/components/studio/AnnouncementBarControls";
import { buildHeuristicBlueprint } from "@/lib/ai/architect";
import { makeSampleExtracted } from "@/lib/__tests__/fixtures";
import { INSPECTOR_META, type InspectorTargetId } from "@/components/studio/inspectorTargets";

afterEach(() => cleanup());

describe("Field", () => {
  it("associa o rótulo ao controle clonado (getByLabelText)", () => {
    render(
      <Field label="Nome da Loja" labelClassName="mb-1 block">
        <input type="text" defaultValue="x" />
      </Field>
    );
    const input = screen.getByLabelText("Nome da Loja");
    expect(input.tagName).toBe("INPUT");
    expect(input.id).not.toBe("");
  });

  it("mantém o id existente e aceita render-prop", () => {
    render(
      <>
        <Field label="Com id">
          <select id="meu-select">
            <option>a</option>
          </select>
        </Field>
        <Field label="Render-prop">{(id) => <textarea id={id} />}</Field>
      </>
    );
    expect(screen.getByLabelText("Com id").id).toBe("meu-select");
    expect(screen.getByLabelText("Render-prop").tagName).toBe("TEXTAREA");
  });

  it("sem className não cria wrapper (visual inalterado)", () => {
    const { container } = render(
      <div data-testid="pai">
        <Field label="Campo">
          <input />
        </Field>
      </div>
    );
    const pai = container.firstElementChild!;
    expect(Array.from(pai.children).map((c) => c.tagName)).toEqual(["LABEL", "INPUT"]);
  });
});

const TABS = ["a", "b", "c"] as const;
function TabsHarness() {
  const [sel, setSel] = useState<(typeof TABS)[number]>("a");
  const t = useTabs({ tabs: TABS, selected: sel, onSelect: setSel });
  return (
    <>
      <div {...t.getTabListProps("Abas")}>
        {TABS.map((tab) => (
          <button key={tab} type="button" {...t.getTabProps(tab)} onClick={() => setSel(tab)}>
            Aba {tab}
          </button>
        ))}
      </div>
      <div {...t.getPanelProps(sel)}>Conteúdo {sel}</div>
    </>
  );
}

describe("useTabs", () => {
  it("expõe tablist/tab/tabpanel com aria-controls e aria-labelledby", () => {
    render(<TabsHarness />);
    const tab = screen.getByRole("tab", { name: "Aba a" });
    const panel = screen.getByRole("tabpanel", { name: "Aba a" });
    expect(screen.getByRole("tablist", { name: "Abas" })).toBeTruthy();
    expect(tab.getAttribute("aria-controls")).toBe(panel.id);
    expect(tab.getAttribute("aria-selected")).toBe("true");
  });

  it("navega com setas, Home e End com roving tabindex", () => {
    render(<TabsHarness />);
    const [a, b, c] = screen.getAllByRole("tab");
    a!.focus();
    expect(a!.tabIndex).toBe(0);
    expect(b!.tabIndex).toBe(-1);

    fireEvent.keyDown(a!, { key: "ArrowRight" });
    expect(document.activeElement).toBe(b);
    expect(b!.getAttribute("aria-selected")).toBe("true");
    expect(b!.tabIndex).toBe(0);
    expect(a!.tabIndex).toBe(-1);
    expect(screen.getByRole("tabpanel").textContent).toBe("Conteúdo b");

    fireEvent.keyDown(b!, { key: "End" });
    expect(document.activeElement).toBe(c);
    fireEvent.keyDown(c!, { key: "ArrowRight" });
    expect(document.activeElement).toBe(a);
    fireEvent.keyDown(a!, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(c);
    fireEvent.keyDown(c!, { key: "Home" });
    expect(document.activeElement).toBe(a);
    expect(a!.getAttribute("aria-selected")).toBe("true");
  });
});

function renderInspector(targetId: InspectorTargetId) {
  const bp = buildHeuristicBlueprint(makeSampleExtracted());
  return render(
    <ElementInspectorPanel
      previewId="p1"
      bp={bp}
      selection={{ targetId, label: targetId, productId: bp.products[0]?.id }}
      onUpdateBp={vi.fn()}
      onSelect={vi.fn()}
      onToggleSection={vi.fn()}
      onMoveSection={vi.fn()}
      onDownloadBenefitsPng={vi.fn()}
    />
  );
}

function expectAllControlsNamed() {
  const controls = [
    ...screen.queryAllByRole("textbox"),
    ...screen.queryAllByRole("combobox"),
    ...screen.queryAllByRole("slider"),
    ...screen.queryAllByRole("spinbutton"),
    ...screen.queryAllByRole("checkbox"),
  ];
  const buttons = screen.getAllByRole("button");
  const named = (role: string) => screen.queryAllByRole(role, { name: /\S/ }).length;
  expect(controls.length).toBeGreaterThan(0);
  expect(
    named("textbox") + named("combobox") + named("slider") + named("spinbutton") + named("checkbox")
  ).toBe(controls.length);
  expect(named("button")).toBe(buttons.length);
}

describe("acessibilidade do Inspector", () => {
  it.each(Object.keys(INSPECTOR_META) as InspectorTargetId[])(
    "todo campo e botão de %s tem nome acessível",
    (target) => {
      renderInspector(target);
      expectAllControlsNamed();
    }
  );

  it("rótulos do Inspector apontam para o campo (getByLabelText)", () => {
    renderInspector("header-logo");
    expect(screen.getByLabelText("Nome da Loja").tagName).toBe("INPUT");
    expect(screen.getByLabelText("Posição da Logo no Cabeçalho").tagName).toBe("SELECT");
  });

  it("botões só-ícone da barra de anúncios têm aria-label", () => {
    const bp = buildHeuristicBlueprint(makeSampleExtracted());
    bp.visualOverrides.announcement.messages = ["Um", "Dois"];
    render(<AnnouncementBarControls bp={bp} onUpdateBp={vi.fn()} />);
    expect(screen.getAllByRole("button", { name: "Subir mensagem" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Remover mensagem" })).toHaveLength(2);
    expect(screen.getByRole("textbox", { name: "Mensagem 1" })).toBeTruthy();
    expectAllControlsNamed();
  });
});
