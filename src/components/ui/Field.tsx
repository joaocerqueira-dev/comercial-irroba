"use client";

import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";

type ControlElement = ReactElement<{ id?: string }>;

export interface FieldProps {
  /** Texto (ou nó) do rótulo. */
  label: ReactNode;
  /** Classes do <label>. */
  labelClassName?: string;
  /**
   * Classes de um <div> que envolve rótulo + controle. Sem ela, o Field não cria wrapper
   * (rótulo e controle saem como irmãos), para encaixar no layout existente sem mudar o visual.
   */
  className?: string;
  /**
   * O controle (input/select/textarea), que recebe o `id` automaticamente (se já tiver um,
   * ele é mantido), ou uma render-prop `(id) => ReactNode` para controles compostos.
   */
  children: ControlElement | ((id: string) => ReactNode);
}

/** Rótulo associado ao controle via `htmlFor`/`id` (useId), para leitores de tela e clique. */
export function Field({ label, labelClassName, className, children }: FieldProps) {
  const generatedId = useId();
  let id = generatedId;
  let control: ReactNode;

  if (typeof children === "function") {
    control = children(id);
  } else if (isValidElement(children)) {
    id = children.props.id ?? generatedId;
    control = children.props.id ? children : cloneElement(children, { id });
  } else {
    control = children;
  }

  const content = (
    <>
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      {control}
    </>
  );

  return className !== undefined ? <div className={className}>{content}</div> : content;
}
