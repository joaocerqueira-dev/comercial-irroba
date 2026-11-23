"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { copyToClipboard } from "@/lib/client/clipboard";

/** Copia texto e marca a chave copiada por alguns segundos. */
export function useCopyToClipboard(resetMs = 2000) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const copy = useCallback(
    async (key: string, text: string) => {
      const ok = await copyToClipboard(text);
      if (ok) {
        setCopiedKey(key);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopiedKey(null), resetMs);
      }
      return ok;
    },
    [resetMs]
  );
  return { copiedKey, copy };
}
