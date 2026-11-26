"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { StoreBlueprint } from "@/lib/types/blueprint";
import { ColorField } from "./ColorField";
import { Field } from "@/components/ui/Field";

interface AnnouncementBarControlsProps {
  bp: StoreBlueprint;
  onUpdateBp: (updater: (prev: StoreBlueprint) => StoreBlueprint) => void;
  showColors?: boolean;
}

export function AnnouncementBarControls({
  bp,
  onUpdateBp,
  showColors = true,
}: AnnouncementBarControlsProps) {
  const ann = bp.visualOverrides.announcement;
  const messages =
    ann.messages && ann.messages.length > 0 ? ann.messages : [bp.sections.announcementText];
  const rollingEnabled = ann.rollingEnabled ?? messages.length > 1;
  const intervalSeconds = ann.intervalSeconds ?? 4;
  const transitionMode = ann.transitionMode ?? "slide-up";

  const commitMessages = (
    nextMessages: string[],
    extraPatch?: Partial<StoreBlueprint["visualOverrides"]["announcement"]>
  ) => {
    const safeList = nextMessages.length > 0 ? nextMessages : [""];
    onUpdateBp((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        announcementText: safeList[0] ?? "",
      },
      visualOverrides: {
        ...prev.visualOverrides,
        announcement: {
          ...prev.visualOverrides.announcement,
          messages: safeList,
          ...extraPatch,
        },
      },
    }));
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-zinc-800">Mensagens da Barra Superior</span>
          <button
            type="button"
            onClick={() => {
              const next = [
                ...messages,
                messages.length === 1
                  ? "5% OFF no PIX · Parcelamento sem juros"
                  : `Aviso promocional ${messages.length + 1}`,
              ];
              commitMessages(next, { rollingEnabled: true });
            }}
            className="inline-flex items-center gap-1 rounded-md bg-irroba-ink px-2 py-1 text-xs font-semibold text-white hover:bg-zinc-800"
          >
            <Plus className="h-3 w-3" />
            Mensagem
          </button>
        </div>

        <div className="space-y-1.5">
          {messages.map((msg, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <span className="w-4 shrink-0 text-center font-mono text-[11px] font-bold text-zinc-400">
                {idx + 1}
              </span>
              <input
                aria-label={`Mensagem ${idx + 1}`}
                type="text"
                value={msg}
                placeholder={`Mensagem ${idx + 1}...`}
                onChange={(e) => {
                  const next = messages.map((m, i) => (i === idx ? e.target.value : m));
                  commitMessages(next);
                }}
                className="min-w-0 flex-1 rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900"
              />
              <button
                type="button"
                disabled={idx === 0}
                onClick={() => {
                  const next = [...messages];
                  const [moved] = next.splice(idx, 1);
                  if (!moved) return;
                  next.splice(idx - 1, 0, moved);
                  commitMessages(next);
                }}
                aria-label="Subir mensagem"
                title="Subir mensagem"
                className="rounded p-1 text-zinc-400 hover:bg-white hover:text-zinc-700 disabled:opacity-30"
              >
                <ArrowUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                disabled={idx === messages.length - 1}
                onClick={() => {
                  const next = [...messages];
                  const [moved] = next.splice(idx, 1);
                  if (!moved) return;
                  next.splice(idx + 1, 0, moved);
                  commitMessages(next);
                }}
                aria-label="Descer mensagem"
                title="Descer mensagem"
                className="rounded p-1 text-zinc-400 hover:bg-white hover:text-zinc-700 disabled:opacity-30"
              >
                <ArrowDown className="h-3 w-3" />
              </button>
              {messages.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const next = messages.filter((_, i) => i !== idx);
                    commitMessages(next);
                  }}
                  aria-label="Remover mensagem"
                  title="Remover mensagem"
                  className="rounded p-1 text-zinc-400 hover:text-rose-600"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        <label className="flex items-center justify-between gap-2 border-t border-zinc-200 pt-2">
          <span className="font-medium text-zinc-700">
            Rolar mensagens uma de cada vez
          </span>
          <input
            type="checkbox"
            checked={rollingEnabled}
            onChange={(e) =>
              onUpdateBp((prev) => ({
                ...prev,
                visualOverrides: {
                  ...prev.visualOverrides,
                  announcement: {
                    ...prev.visualOverrides.announcement,
                    rollingEnabled: e.target.checked,
                  },
                },
              }))
            }
          />
        </label>

        {rollingEnabled && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <div className="mb-1 flex items-center justify-between text-zinc-600">
                <span>Tempo (seg.)</span>
                <strong className="font-mono text-zinc-900">{intervalSeconds}s</strong>
              </div>
              <input
                aria-label="Tempo de rolagem (segundos)"
                type="range"
                min={1}
                max={15}
                step={1}
                value={intervalSeconds}
                onChange={(e) =>
                  onUpdateBp((prev) => ({
                    ...prev,
                    visualOverrides: {
                      ...prev.visualOverrides,
                      announcement: {
                        ...prev.visualOverrides.announcement,
                        rollingEnabled: true,
                        intervalSeconds: Number(e.target.value),
                      },
                    },
                  }))
                }
                className="w-full accent-brand-500"
              />
            </div>

            <div>
              <Field label="Estilo de Rolagem" labelClassName="mb-1 block text-zinc-600">
              <select
                value={transitionMode}
                onChange={(e) =>
                  onUpdateBp((prev) => ({
                    ...prev,
                    visualOverrides: {
                      ...prev.visualOverrides,
                      announcement: {
                        ...prev.visualOverrides.announcement,
                        rollingEnabled: true,
                        transitionMode: e.target.value as
                          | "slide-up"
                          | "slide-horizontal"
                          | "fade",
                      },
                    },
                  }))
                }
                className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-800"
              >
                <option value="slide-up">Rolar Vertical</option>
                <option value="slide-horizontal">Deslizar Lateral</option>
                <option value="fade">Transição Suave</option>
              </select>
              </Field>
            </div>
          </div>
        )}
      </div>

      {showColors && (
        <div className="grid grid-cols-2 gap-2.5">
          <ColorField
            label="Cor de Fundo"
            value={ann.background}
            onChange={(v) =>
              onUpdateBp((prev) => ({
                ...prev,
                visualOverrides: {
                  ...prev.visualOverrides,
                  announcement: { ...prev.visualOverrides.announcement, background: v },
                },
              }))
            }
          />
          <ColorField
            label="Cor do Texto"
            value={ann.foreground}
            contrastWith={ann.background}
            onChange={(v) =>
              onUpdateBp((prev) => ({
                ...prev,
                visualOverrides: {
                  ...prev.visualOverrides,
                  announcement: { ...prev.visualOverrides.announcement, foreground: v },
                },
              }))
            }
          />
        </div>
      )}
    </div>
  );
}
