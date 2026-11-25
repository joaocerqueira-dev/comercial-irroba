"use client";

import { ColorField } from "../ColorField";
import { Field } from "@/components/ui/Field";
import type { InspectorTargetProps } from "./types";

/** Newsletter. */
export function NewsletterInspector({ bp, onUpdateBp }: InspectorTargetProps) {
  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3">
      <div>
        <Field label="Título da Newsletter" labelClassName="mb-1 block text-zinc-500">
        <input
          type="text"
          value={bp.sections.newsletter?.headline ?? `Receba novidades da ${bp.brand.name}`}
          onChange={(e) =>
            onUpdateBp((prev) => ({
              ...prev,
              sections: {
                ...prev.sections,
                newsletter: { ...prev.sections.newsletter, headline: e.target.value },
              },
            }))
          }
          className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
        />
        </Field>
      </div>
      <div>
        <Field label="Subtítulo" labelClassName="mb-1 block text-zinc-500">
        <input
          type="text"
          value={
            bp.sections.newsletter?.subheadline ??
            "Cadastre seu e-mail para garantir ofertas exclusivas em primeira mão."
          }
          onChange={(e) =>
            onUpdateBp((prev) => ({
              ...prev,
              sections: {
                ...prev.sections,
                newsletter: { ...prev.sections.newsletter, subheadline: e.target.value },
              },
            }))
          }
          className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
        />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Field label="Placeholder do E-mail" labelClassName="mb-1 block text-zinc-500">
          <input
            type="text"
            value={bp.sections.newsletter?.placeholder ?? "Digite seu melhor e-mail"}
            onChange={(e) =>
              onUpdateBp((prev) => ({
                ...prev,
                sections: {
                  ...prev.sections,
                  newsletter: { ...prev.sections.newsletter, placeholder: e.target.value },
                },
              }))
            }
            className="w-full rounded-lg border border-zinc-200 px-2 py-1.5"
          />
          </Field>
        </div>
        <div>
          <Field label="Texto do Botão" labelClassName="mb-1 block text-zinc-500">
          <input
            type="text"
            value={bp.sections.newsletter?.ctaText ?? "Cadastrar"}
            onChange={(e) =>
              onUpdateBp((prev) => ({
                ...prev,
                sections: {
                  ...prev.sections,
                  newsletter: { ...prev.sections.newsletter, ctaText: e.target.value },
                },
              }))
            }
            className="w-full rounded-lg border border-zinc-200 px-2 py-1.5"
          />
          </Field>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <ColorField
          label="Fundo da Caixa"
          value={bp.theme.neutralBackground}
          onChange={(v) =>
            onUpdateBp((prev) => ({
              ...prev,
              theme: { ...prev.theme, neutralBackground: v },
            }))
          }
        />
        <ColorField
          label="Texto da Caixa"
          value={bp.theme.neutralForeground}
          contrastWith={bp.theme.neutralBackground}
          onChange={(v) =>
            onUpdateBp((prev) => ({
              ...prev,
              theme: { ...prev.theme, neutralForeground: v },
            }))
          }
        />
      </div>
    </div>
  );
}
