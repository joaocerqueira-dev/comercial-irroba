"use client";

import { useId } from "react";
import { ContrastBadge } from "@/components/ui/ContrastBadge";

export function ColorField({
  label,
  value,
  onChange,
  contrastWith,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  /** Cor de fundo para exibir o selo de contraste WCAG */
  contrastWith?: string;
}) {
  const safeHex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#111827";
  const fieldId = useId();
  return (
    <div className="block">
      <span className="mb-1 flex items-center justify-between gap-1 text-xs font-medium text-slate-600">
        <label htmlFor={fieldId}>{label}</label>
        {contrastWith && <ContrastBadge fg={value} bg={contrastWith} />}
      </span>
      <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1">
        <input
          type="color"
          value={safeHex}
          aria-label={`${label} (seletor)`}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-6 w-7 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <input
          id={fieldId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 font-mono text-xs text-slate-800 focus:outline-none"
        />
      </div>
    </div>
  );
}
