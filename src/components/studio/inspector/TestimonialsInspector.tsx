"use client";

import { Plus, Star, Trash2 } from "lucide-react";
import { Field } from "@/components/ui/Field";
import type { InspectorTargetProps } from "./types";

/** Avaliações de clientes. */
export function TestimonialsInspector({ bp, selection, onUpdateBp }: InspectorTargetProps) {
  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3">
      <div>
        <Field label="Título da Seção" labelClassName="mb-1 block font-semibold text-zinc-700">
        <input
          type="text"
          value={bp.sections.testimonialsTitle}
          onChange={(e) =>
            onUpdateBp((prev) => ({
              ...prev,
              sections: { ...prev.sections, testimonialsTitle: e.target.value },
            }))
          }
          className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5"
        />
        </Field>
      </div>

      <div className="flex items-center justify-between">
        <span className="font-semibold text-zinc-700">Depoimentos Exibidos</span>
        <button
          type="button"
          onClick={() =>
            onUpdateBp((prev) => ({
              ...prev,
              sections: {
                ...prev.sections,
                testimonialsIllustrative: false,
                testimonials: [
                  ...prev.sections.testimonials,
                  {
                    author: "Cliente Verificado",
                    rating: 5,
                    comment: "Atendimento impecável e entrega super rápida!",
                  },
                ],
              },
            }))
          }
          className="inline-flex items-center gap-1 rounded-md bg-irroba-ink px-2 py-1 text-xs font-semibold text-white"
        >
          <Plus className="h-3 w-3" /> Avaliação
        </button>
      </div>

      {bp.sections.testimonials.map((rev, idx) => (
        <div
          key={idx}
          className={`space-y-1.5 rounded-lg border p-2.5 ${
            selection.subIndex === idx
              ? "border-brand-400 bg-brand-50/50"
              : "border-zinc-200 bg-zinc-50"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <input
              aria-label="Nome do cliente"
              type="text"
              value={rev.author}
              placeholder="Nome do cliente"
              onChange={(e) =>
                onUpdateBp((prev) => ({
                  ...prev,
                  sections: {
                    ...prev.sections,
                    testimonials: prev.sections.testimonials.map((t, i) =>
                      i === idx ? { ...t, author: e.target.value } : t
                    ),
                  },
                }))
              }
              className="min-w-0 flex-1 rounded border border-zinc-200 bg-white px-2 py-1 font-semibold text-zinc-800"
            />
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() =>
                    onUpdateBp((prev) => ({
                      ...prev,
                      sections: {
                        ...prev.sections,
                        testimonials: prev.sections.testimonials.map((t, i) =>
                          i === idx ? { ...t, rating: star } : t
                        ),
                      },
                    }))
                  }
                  className="p-0.5"
                  aria-label={`${star} estrela(s)`}
                  title={`${star} estrela(s)`}
                >
                  <Star
                    className={`h-3.5 w-3.5 ${
                      star <= rev.rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-zinc-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            {bp.sections.testimonials.length > 1 && (
              <button
                type="button"
                aria-label="Remover depoimento"
                onClick={() =>
                  onUpdateBp((prev) => ({
                    ...prev,
                    sections: {
                      ...prev.sections,
                      testimonials: prev.sections.testimonials.filter((_, i) => i !== idx),
                    },
                  }))
                }
                className="text-zinc-400 hover:text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <textarea
            aria-label="Comentário do cliente"
            rows={2}
            value={rev.comment}
            onChange={(e) =>
              onUpdateBp((prev) => ({
                ...prev,
                sections: {
                  ...prev.sections,
                  testimonials: prev.sections.testimonials.map((t, i) =>
                    i === idx ? { ...t, comment: e.target.value } : t
                  ),
                },
              }))
            }
            className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-zinc-700"
          />
        </div>
      ))}
    </div>
  );
}
