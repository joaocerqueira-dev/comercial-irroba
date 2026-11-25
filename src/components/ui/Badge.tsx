import type { ReactNode } from "react";

type Tone = "neutral" | "brand" | "success" | "info" | "warning";
const TONES: Record<Tone, string> = {
  neutral: "bg-zinc-100 text-zinc-800",
  brand: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200/70",
  success: "bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200/70",
  info: "bg-zinc-100 text-irroba-ink",
  warning: "bg-amber-100 text-amber-900",
};

export function Badge({ tone = "neutral", title, children }: { tone?: Tone; title?: string; children: ReactNode }) {
  return (
    <span title={title} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${TONES[tone]}`}>
      {children}
    </span>
  );
}
