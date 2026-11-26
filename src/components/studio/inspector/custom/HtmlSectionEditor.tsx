"use client";

import { HtmlAiEditor } from "../../HtmlAiEditor";
import { Field } from "@/components/ui/Field";
import type { CustomSection, StoreBlueprint } from "@/lib/types/blueprint";
import type { CustomSectionUpdater } from "./types";

/** Editor da seção personalizada do tipo "html". */
export function HtmlSectionEditor({
  section: activeCustomSection,
  update: updateCustomSection,
  bp,
  previewId,
}: {
  section: Extract<CustomSection, { kind: "html" }>;
  update: CustomSectionUpdater;
  bp: StoreBlueprint;
  previewId: string;
}) {
  return (
    <>
      <div>
        <Field label="Largura na Página" labelClassName="mb-1 block text-zinc-500">
          <select
            value={activeCustomSection.width}
            onChange={(e) =>
              updateCustomSection((cs) =>
                cs.kind === "html" ? { ...cs, width: e.target.value as "container" | "full" } : cs
              )
            }
            className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-zinc-800"
          >
            <option value="container">Padrão do site (1280px)</option>
            <option value="full">Largura Total</option>
          </select>
        </Field>
      </div>
      <HtmlAiEditor
        previewId={previewId}
        html={activeCustomSection.html}
        sectionTitle={activeCustomSection.title}
        widthMode={activeCustomSection.width}
        bp={bp}
        onChange={(nextHtml) =>
          updateCustomSection((cs) => (cs.kind === "html" ? { ...cs, html: nextHtml } : cs))
        }
        onSuggestedTitle={(nextTitle) =>
          updateCustomSection((cs) => (cs.kind === "html" ? { ...cs, title: nextTitle } : cs))
        }
      />
    </>
  );
}
