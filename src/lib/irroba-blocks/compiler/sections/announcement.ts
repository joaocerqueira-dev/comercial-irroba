import { escapeAttr, escapeHtml } from "../../sanitize";
import type { StoreBlueprint } from "@/lib/types/blueprint";
import type { StorefrontContext } from "../context";

/** Barra de Aviso (overline): mensagem fixa ou ticker rolante. */
export function renderAnnouncementBar(bp: StoreBlueprint, ctx: StorefrontContext): string {
  const { announcementMessages, announcementRolling, announcementIntervalMs, announcementTransition } = ctx;
  return announcementRolling
    ? `<div class="overlineModule overlineModule--ticker" id="irb-overline-ticker" data-interval-ms="${announcementIntervalMs}" data-transition="${escapeAttr(announcementTransition)}">
    <div class="overlineModule__track">
      ${(announcementMessages.length === 1
        ? [announcementMessages[0], announcementMessages[0]]
        : announcementMessages
      )
        .map(
          (msg, idx) =>
            `<div class="overlineModule__slide ${idx === 0 ? "is-active" : ""}" data-overline-idx="${idx}">${escapeHtml(msg)}</div>`
        )
        .join("")}
    </div>
  </div>`
    : `<div class="overlineModule">${escapeHtml(announcementMessages[0] ?? bp.sections.announcementText)}</div>`;
}
