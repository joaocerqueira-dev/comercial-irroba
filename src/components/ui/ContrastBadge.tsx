import { contrastRatio } from "@/lib/ai/color-utils";

/** Selo de contraste WCAG (AA = 4,5:1 para texto normal). */
export function ContrastBadge({ fg, bg }: { fg: string; bg: string }) {
  let ratio = 0;
  try {
    ratio = contrastRatio(fg, bg);
  } catch {
    return null;
  }
  if (!Number.isFinite(ratio) || ratio <= 0) return null;
  const level = ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA grande" : "Baixo";
  const ok = ratio >= 4.5;
  return (
    <span
      title={`Contraste ${ratio.toFixed(2)}:1 (WCAG: AA exige 4,5:1 para texto normal)`}
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold ${
        ok ? "bg-emerald-100 text-emerald-900" : "bg-rose-100 text-rose-900"
      }`}
    >
      {ratio.toFixed(1)}:1 · {level}
    </span>
  );
}
