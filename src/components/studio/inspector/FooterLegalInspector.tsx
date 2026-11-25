"use client";

import { ColorField } from "../ColorField";
import { Field } from "@/components/ui/Field";
import type { InspectorTargetProps } from "./types";

/** Rodapé (faixa legal). */
export function FooterLegalInspector({ bp, onUpdateBp }: InspectorTargetProps) {
  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3">
      <div>
        <Field label="Texto de Direitos Autorais / CNPJ" labelClassName="mb-1 block font-semibold text-zinc-700">
        <textarea
          rows={2}
          value={bp.footer.legalText ?? ""}
          placeholder={`© ${new Date().getFullYear()} ${bp.brand.name} — Todos os direitos reservados.`}
          onChange={(e) =>
            onUpdateBp((prev) => ({
              ...prev,
              footer: { ...prev.footer, legalText: e.target.value },
            }))
          }
          className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
        />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <ColorField
          label="Fundo da Faixa Legal"
          value={bp.visualOverrides.footer.legalBackground}
          onChange={(v) =>
            onUpdateBp((prev) => ({
              ...prev,
              visualOverrides: {
                ...prev.visualOverrides,
                footer: { ...prev.visualOverrides.footer, legalBackground: v },
              },
            }))
          }
        />
        <ColorField
          label="Texto da Faixa Legal"
          value={bp.visualOverrides.footer.legalForeground}
          contrastWith={bp.visualOverrides.footer.legalBackground}
          onChange={(v) =>
            onUpdateBp((prev) => ({
              ...prev,
              visualOverrides: {
                ...prev.visualOverrides,
                footer: { ...prev.visualOverrides.footer, legalForeground: v },
              },
            }))
          }
        />
      </div>
    </div>
  );
}
