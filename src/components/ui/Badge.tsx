import type { ReactNode } from "react";

type Tone = "neutral" | "success" | "info" | "warning";
const TONES: Record<Tone, string> = {
  neutral: "bg-slate-200 text-slate-800",
  success: "bg-emerald-100 text-emerald-900",
  info: "bg-indigo-100 text-indigo-900",
  warning: "bg-amber-100 text-amber-900",
};

export function Badge({ tone = "neutral", title, children }: { tone?: Tone; title?: string; children: ReactNode }) {
  return (
    <span title={title} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${TONES[tone]}`}>
      {children}
    </span>
  );
}
