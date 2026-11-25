"use client";

import { CardStyleControls } from "./CardStyleControls";
import type { InspectorTargetProps } from "./types";

/** Botão Comprar: só o estilo dos cards e do botão. */
export function BuyButtonInspector({ bp, onUpdateBp }: InspectorTargetProps) {
  return <CardStyleControls bp={bp} onUpdateBp={onUpdateBp} />;
}
