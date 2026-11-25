"use client";

import type { ReactNode } from "react";
import type { StoreBlueprint } from "@/lib/types/blueprint";

/** Acrescenta uma categoria ao menu (href âncora única). */
export const addCategory =
  (label: string) =>
  (prev: StoreBlueprint): StoreBlueprint => ({
    ...prev,
    sections: {
      ...prev.sections,
      categories: [...prev.sections.categories, { label, href: `#cat-${crypto.randomUUID()}` }],
    },
  });

interface CategoryAdderProps {
  /** Rascunho do nome (controlado: o dono decide por quanto tempo ele sobrevive). */
  value: string;
  onValueChange: (next: string) => void;
  onUpdateBp: (updater: (prev: StoreBlueprint) => StoreBlueprint) => void;
  /** Enter no campo também adiciona. */
  submitOnEnter?: boolean;
  placeholder: string;
  className: string;
  inputClassName: string;
  buttonClassName: string;
  buttonAriaLabel?: string;
  buttonContent: ReactNode;
}

/** Campo + botão "adicionar categoria" usado pela aba Seções e pelo Inspector do menu. */
export function CategoryAdder({
  value,
  onValueChange,
  onUpdateBp,
  submitOnEnter = false,
  placeholder,
  className,
  inputClassName,
  buttonClassName,
  buttonAriaLabel,
  buttonContent,
}: CategoryAdderProps) {
  const submit = () => {
    const label = value.trim();
    if (!label) return;
    onUpdateBp(addCategory(label));
    onValueChange("");
  };

  return (
    <div className={className}>
      <input
        aria-label="Nova categoria do menu"
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={
          submitOnEnter
            ? (e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }
            : undefined
        }
        className={inputClassName}
      />
      <button type="button" aria-label={buttonAriaLabel} onClick={submit} className={buttonClassName}>
        {buttonContent}
      </button>
    </div>
  );
}
