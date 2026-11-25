"use client";

import type { StoreBlueprint } from "@/lib/types/blueprint";
import { ColorField } from "./ColorField";

interface HeaderLinksHoverControlsProps {
  bp: StoreBlueprint;
  onUpdateBp: (updater: (prev: StoreBlueprint) => StoreBlueprint) => void;
}

export function HeaderLinksHoverControls({ bp, onUpdateBp }: HeaderLinksHoverControlsProps) {
  const hdr = bp.visualOverrides.header;
  const hoverColor = hdr.linkHoverColor ?? bp.theme.primaryBackground;
  const hoverStyle = hdr.linkHoverStyle ?? "underline";
  const hoverBg = hdr.linkHoverBackground ?? "#F3F4F6";

  return (
    <div className="space-y-2.5 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs">
      <div className="font-semibold text-slate-800">Hover dos Links da Navbar</div>

      <div className="grid grid-cols-2 gap-2">
        <ColorField
          label="Cor no Hover"
          value={hoverColor}
          contrastWith={hdr.background}
          onChange={(v) =>
            onUpdateBp((prev) => ({
              ...prev,
              visualOverrides: {
                ...prev.visualOverrides,
                header: { ...prev.visualOverrides.header, linkHoverColor: v },
              },
            }))
          }
        />

        <div>
          <label className="mb-1 block font-medium text-slate-600">Efeito no Hover</label>
          <select
            value={hoverStyle}
            onChange={(e) =>
              onUpdateBp((prev) => ({
                ...prev,
                visualOverrides: {
                  ...prev.visualOverrides,
                  header: {
                    ...prev.visualOverrides.header,
                    linkHoverStyle: e.target.value as
                      | "underline"
                      | "bottom-bar"
                      | "pill"
                      | "color-only",
                  },
                },
              }))
            }
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-800"
          >
            <option value="underline">Sublinhado</option>
            <option value="bottom-bar">Barra Inferior</option>
            <option value="pill">Pílula com Fundo</option>
            <option value="color-only">Apenas Cor</option>
          </select>
        </div>
      </div>

      {hoverStyle === "pill" && (
        <ColorField
          label="Cor de Fundo no Hover (Pílula)"
          value={hoverBg}
          onChange={(v) =>
            onUpdateBp((prev) => ({
              ...prev,
              visualOverrides: {
                ...prev.visualOverrides,
                header: { ...prev.visualOverrides.header, linkHoverBackground: v },
              },
            }))
          }
        />
      )}
    </div>
  );
}
