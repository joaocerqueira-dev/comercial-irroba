"use client";

import { useCallback, useId, type KeyboardEvent } from "react";

export interface UseTabsOptions<T extends string> {
  /** Abas na ordem visual. */
  tabs: readonly T[];
  /** Aba selecionada (null = nenhuma; a primeira fica focável). */
  selected: T | null;
  onSelect: (tab: T) => void;
}

/**
 * Padrão WAI-ARIA de abas: role="tablist"/"tab"/"tabpanel", aria-selected, aria-controls,
 * aria-labelledby e roving tabindex. Setas ←/→ e Home/End movem o foco e ativam a aba
 * (ativação automática).
 */
export function useTabs<T extends string>({ tabs, selected, onSelect }: UseTabsOptions<T>) {
  const base = useId();
  const tabId = useCallback((tab: T) => `${base}tab-${tab}`, [base]);
  const panelId = useCallback((tab: T) => `${base}panel-${tab}`, [base]);
  const focusable = selected ?? tabs[0];

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const els = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'));
    const current = els.indexOf(e.target as HTMLElement);
    if (current === -1) return;
    const last = els.length - 1;
    let next: number;
    switch (e.key) {
      case "ArrowRight":
        next = current === last ? 0 : current + 1;
        break;
      case "ArrowLeft":
        next = current === 0 ? last : current - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
      default:
        return;
    }
    e.preventDefault();
    const tab = tabs[next];
    if (tab === undefined) return;
    onSelect(tab);
    els[next]?.focus();
  };

  return {
    tabId,
    panelId,
    getTabListProps: (label: string) => ({
      role: "tablist" as const,
      "aria-label": label,
      onKeyDown,
    }),
    /** `controls` permite apontar para um painel com outro id (ex.: painel compartilhado). */
    getTabProps: (tab: T, controls: string = panelId(tab)) => ({
      id: tabId(tab),
      role: "tab" as const,
      "aria-selected": selected === tab,
      "aria-controls": controls,
      tabIndex: tab === focusable ? 0 : -1,
    }),
    getPanelProps: (tab: T, id: string = panelId(tab)) => ({
      id,
      role: "tabpanel" as const,
      "aria-labelledby": tabId(tab),
    }),
  };
}
