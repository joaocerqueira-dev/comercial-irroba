"use client";

import { AnnouncementBarControls } from "../AnnouncementBarControls";
import type { InspectorTargetProps } from "./types";

/** Barra de aviso (overline). */
export function AnnouncementInspector({ bp, onUpdateBp }: InspectorTargetProps) {
  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3">
      <AnnouncementBarControls bp={bp} onUpdateBp={onUpdateBp} />
    </div>
  );
}
