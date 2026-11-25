// @vitest-environment jsdom
import fs from "fs";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { ElementInspectorPanel } from "@/components/studio/ElementInspectorPanel";
import { buildHeuristicBlueprint } from "@/lib/ai/architect";
import { makeSampleExtracted } from "@/lib/__tests__/fixtures";
import { INSPECTOR_META, type InspectorTargetId } from "@/components/studio/inspectorTargets";

/**
 * Fumaça da refatoração do Inspector (fase 7): para cada alvo, os rótulos, nomes acessíveis,
 * botões e títulos renderizados têm de bater com a lista congelada antes da divisão do arquivo.
 * Regerar (só se a mudança de texto for intencional): UPDATE_INSPECTOR_LABELS=1 npx vitest run inspectorLabels
 */
const FIXTURE = path.join(__dirname, "fixtures", "inspector-labels.json");

afterEach(() => cleanup());

function collectLabels(root: HTMLElement): string[] {
  const out: string[] = [];
  root.querySelectorAll("label, button, h2, h3, h4, [aria-label], [placeholder], option").forEach((el) => {
    const tag = el.tagName.toLowerCase();
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    const aria = el.getAttribute("aria-label");
    const ph = el.getAttribute("placeholder");
    out.push([tag, text, aria ? `aria=${aria}` : "", ph ? `ph=${ph}` : ""].filter(Boolean).join(" | "));
  });
  return out;
}

function renderLabels(targetId: InspectorTargetId, extra: { subIndex?: number; showcaseIdx?: number } = {}) {
  const bp = buildHeuristicBlueprint(makeSampleExtracted());
  const { container } = render(
    <ElementInspectorPanel
      previewId="p1"
      bp={bp}
      selection={{ targetId, label: targetId, productId: bp.products[0]?.id, ...extra }}
      onUpdateBp={vi.fn()}
      onSelect={vi.fn()}
      onToggleSection={vi.fn()}
      onMoveSection={vi.fn()}
      onDownloadBenefitsPng={vi.fn()}
      onShowSlide={vi.fn()}
    />
  );
  const labels = collectLabels(container);
  cleanup();
  return labels;
}

function snapshotAll(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const target of Object.keys(INSPECTOR_META) as InspectorTargetId[]) {
    result[target] = renderLabels(target);
  }
  result["extraShowcases#2"] = renderLabels("extraShowcases", { showcaseIdx: 2 });
  result["hero#1"] = renderLabels("hero", { subIndex: 1 });
  return result;
}

describe("Inspector: rótulos congelados por alvo", () => {
  const current = snapshotAll();
  if (process.env.UPDATE_INSPECTOR_LABELS) {
    fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
    fs.writeFileSync(FIXTURE, JSON.stringify(current, null, 2) + "\n");
  }
  const frozen = JSON.parse(fs.readFileSync(FIXTURE, "utf8")) as Record<string, string[]>;

  it("cobre todos os alvos do INSPECTOR_META", () => {
    expect(Object.keys(frozen).sort()).toEqual(Object.keys(current).sort());
  });

  it.each(Object.keys(frozen))("%s renderiza os mesmos rótulos", (key) => {
    expect(frozen[key]!.length).toBeGreaterThan(0);
    expect(current[key]).toEqual(frozen[key]);
  });
});
