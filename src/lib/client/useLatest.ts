"use client";

import { useRef } from "react";

/** Ref que sempre aponta para o valor mais recente (útil para callbacks em effects sem re-disparar). */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
