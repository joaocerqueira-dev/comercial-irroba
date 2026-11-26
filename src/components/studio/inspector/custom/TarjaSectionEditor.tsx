"use client";

import { Plus, Trash2 } from "lucide-react";
import { ColorField } from "../../ColorField";
import type { CustomSection, StoreBlueprint } from "@/lib/types/blueprint";
import type { CustomSectionUpdater } from "./types";

/** Editor da seção personalizada do tipo "tarja". */
export function TarjaSectionEditor({
  section: activeCustomSection,
  update: updateCustomSection,
  bp,
}: {
  section: Extract<CustomSection, { kind: "tarja" }>;
  update: CustomSectionUpdater;
  bp: StoreBlueprint;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <ColorField
          label="Fundo da Tarja"
          value={activeCustomSection.backgroundColor ?? bp.theme.neutralBackground}
          onChange={(v) =>
            updateCustomSection((cs) => (cs.kind === "tarja" ? { ...cs, backgroundColor: v } : cs))
          }
        />
        <ColorField
          label="Cor do Texto"
          value={activeCustomSection.textColor ?? bp.theme.neutralForeground}
          contrastWith={activeCustomSection.backgroundColor ?? bp.theme.neutralBackground}
          onChange={(v) => updateCustomSection((cs) => (cs.kind === "tarja" ? { ...cs, textColor: v } : cs))}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-zinc-700">Itens da Tarja</span>
          <button
            type="button"
            onClick={() =>
              updateCustomSection((cs) =>
                cs.kind === "tarja"
                  ? {
                      ...cs,
                      items: [
                        ...cs.items,
                        {
                          icon: "shield-check",
                          title: "Novo Benefício",
                          subtitle: "Descrição curta",
                        },
                      ],
                    }
                  : cs
              )
            }
            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            <Plus className="h-3 w-3" /> Item
          </button>
        </div>

        {activeCustomSection.items.map((item, idx) => (
          <div key={idx} className="space-y-1.5 rounded-lg border border-zinc-200 bg-zinc-50 p-2">
            <div className="flex items-center justify-between gap-2">
              <select
                aria-label="Ícone do benefício"
                value={item.icon}
                onChange={(e) =>
                  updateCustomSection((cs) =>
                    cs.kind === "tarja"
                      ? {
                          ...cs,
                          items: cs.items.map((it, i) => (i === idx ? { ...it, icon: e.target.value } : it)),
                        }
                      : cs
                  )
                }
                className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs"
              >
                <option value="truck">Entrega (Caminhão)</option>
                <option value="credit-card">Pagamento (Cartão)</option>
                <option value="shield-check">Segurança (Escudo)</option>
                <option value="refresh-cw">Troca Fácil</option>
              </select>
              <button
                type="button"
                onClick={() =>
                  updateCustomSection((cs) =>
                    cs.kind === "tarja" ? { ...cs, items: cs.items.filter((_, i) => i !== idx) } : cs
                  )
                }
                className="rounded p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                title="Remover item"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <input
              aria-label="Título"
              type="text"
              value={item.title}
              placeholder="Título"
              onChange={(e) =>
                updateCustomSection((cs) =>
                  cs.kind === "tarja"
                    ? {
                        ...cs,
                        items: cs.items.map((it, i) => (i === idx ? { ...it, title: e.target.value } : it)),
                      }
                    : cs
                )
              }
              className="w-full rounded border border-zinc-200 bg-white px-2 py-1"
            />
            <input
              aria-label="Subtítulo"
              type="text"
              value={item.subtitle}
              placeholder="Subtítulo"
              onChange={(e) =>
                updateCustomSection((cs) =>
                  cs.kind === "tarja"
                    ? {
                        ...cs,
                        items: cs.items.map((it, i) =>
                          i === idx ? { ...it, subtitle: e.target.value } : it
                        ),
                      }
                    : cs
                )
              }
              className="w-full rounded border border-zinc-200 bg-white px-2 py-1"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
