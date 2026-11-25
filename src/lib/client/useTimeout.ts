"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Agenda um único timeout por vez: um novo `schedule` cancela o anterior,
 * e o pendente é limpo no unmount (evita setState em componente desmontado).
 */
export function useTimeout() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const schedule = useCallback(
    (fn: () => void, ms: number) => {
      clear();
      timer.current = setTimeout(() => {
        timer.current = null;
        fn();
      }, ms);
    },
    [clear]
  );

  useEffect(() => clear, [clear]);

  return { schedule, clear };
}
