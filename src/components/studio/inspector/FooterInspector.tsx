"use client";

import { ColorField } from "../ColorField";
import { Field } from "@/components/ui/Field";
import type { InspectorTargetProps } from "./types";

/** Rodapé (informações). */
export function FooterInspector({ bp, onUpdateBp, onSelect }: InspectorTargetProps) {
  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3">
      <div>
        <Field label="Largura do Rodapé" labelClassName="mb-1 block text-zinc-500">
          <select
            value={bp.visualOverrides.footer.width}
            onChange={(e) =>
              onUpdateBp((prev) => ({
                ...prev,
                visualOverrides: {
                  ...prev.visualOverrides,
                  footer: {
                    ...prev.visualOverrides.footer,
                    width: e.target.value as "container" | "full",
                  },
                },
              }))
            }
            className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-zinc-800"
          >
            <option value="container">Padrão do site (1280px)</option>
            <option value="full">Largura Total</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <ColorField
          label="Fundo do Rodapé"
          value={bp.visualOverrides.footer.background}
          onChange={(v) =>
            onUpdateBp((prev) => ({
              ...prev,
              visualOverrides: {
                ...prev.visualOverrides,
                footer: { ...prev.visualOverrides.footer, background: v },
              },
            }))
          }
        />
        <ColorField
          label="Texto do Rodapé"
          value={bp.visualOverrides.footer.foreground}
          contrastWith={bp.visualOverrides.footer.background}
          onChange={(v) =>
            onUpdateBp((prev) => ({
              ...prev,
              visualOverrides: {
                ...prev.visualOverrides,
                footer: { ...prev.visualOverrides.footer, foreground: v },
              },
            }))
          }
        />
      </div>

      <div>
        <Field label="Sobre a Loja" labelClassName="mb-1 block text-zinc-500">
          <textarea
            rows={3}
            value={bp.footer.aboutText}
            onChange={(e) =>
              onUpdateBp((prev) => ({
                ...prev,
                footer: { ...prev.footer, aboutText: e.target.value },
              }))
            }
            className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
          />
        </Field>
      </div>

      <div className="space-y-2">
        <div>
          <Field label="WhatsApp de Atendimento" labelClassName="mb-1 block text-zinc-500">
            <input
              type="text"
              value={bp.footer.whatsapp ?? ""}
              placeholder="Ex: (11) 99999-9999"
              onChange={(e) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  footer: { ...prev.footer, whatsapp: e.target.value },
                }))
              }
              className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
            />
          </Field>
        </div>
        <div>
          <Field label="E-mail de Contato" labelClassName="mb-1 block text-zinc-500">
            <input
              type="email"
              value={bp.footer.email ?? ""}
              placeholder="contato@loja.com.br"
              onChange={(e) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  footer: { ...prev.footer, email: e.target.value },
                }))
              }
              className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
            />
          </Field>
        </div>
        <div>
          <Field label="URL do Instagram" labelClassName="mb-1 block text-zinc-500">
            <input
              type="text"
              value={bp.footer.instagram ?? ""}
              placeholder="https://instagram.com/sualoja"
              onChange={(e) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  footer: { ...prev.footer, instagram: e.target.value },
                }))
              }
              className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
            />
          </Field>
        </div>
        <div>
          <Field label="URL do Facebook" labelClassName="mb-1 block text-zinc-500">
            <input
              type="text"
              value={bp.footer.facebook ?? ""}
              placeholder="https://facebook.com/sualoja"
              onChange={(e) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  footer: { ...prev.footer, facebook: e.target.value },
                }))
              }
              className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Field label="Telefone" labelClassName="mb-1 block text-zinc-500">
              <input
                type="text"
                value={bp.footer.phone ?? ""}
                placeholder="(16) 3333-0000"
                onChange={(e) =>
                  onUpdateBp((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, phone: e.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
              />
            </Field>
          </div>
          <div>
            <Field label="Horário" labelClassName="mb-1 block text-zinc-500">
              <input
                type="text"
                value={bp.footer.openingHours ?? ""}
                placeholder="Seg. à Sex. das 08h às 18h"
                onChange={(e) =>
                  onUpdateBp((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, openingHours: e.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
              />
            </Field>
          </div>
        </div>
        <div>
          <Field label="Endereço / Cidade" labelClassName="mb-1 block text-zinc-500">
            <input
              type="text"
              value={bp.footer.address ?? ""}
              placeholder="Rua Exemplo, 100 - Centro"
              onChange={(e) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  footer: { ...prev.footer, address: e.target.value },
                }))
              }
              className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
            />
          </Field>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 space-y-1.5">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
          Selos do Rodapé (LIME)
        </div>
        <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
          <input
            type="checkbox"
            checked={bp.footer.showPaymentSeals !== false}
            onChange={(e) =>
              onUpdateBp((prev) => ({
                ...prev,
                footer: { ...prev.footer, showPaymentSeals: e.target.checked },
              }))
            }
            className="rounded border-zinc-300"
          />
          Formas de Pagamento
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
          <input
            type="checkbox"
            checked={bp.footer.showShippingSeals !== false}
            onChange={(e) =>
              onUpdateBp((prev) => ({
                ...prev,
                footer: { ...prev.footer, showShippingSeals: e.target.checked },
              }))
            }
            className="rounded border-zinc-300"
          />
          Formas de Envio
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
          <input
            type="checkbox"
            checked={bp.footer.showSecuritySeals !== false}
            onChange={(e) =>
              onUpdateBp((prev) => ({
                ...prev,
                footer: { ...prev.footer, showSecuritySeals: e.target.checked },
              }))
            }
            className="rounded border-zinc-300"
          />
          Selos de Segurança
        </label>
      </div>

      <button
        type="button"
        onClick={() => onSelect({ targetId: "footer-legal", label: "Rodapé — Faixa Legal" })}
        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
      >
        Editar Faixa Legal / CNPJ →
      </button>
    </div>
  );
}
