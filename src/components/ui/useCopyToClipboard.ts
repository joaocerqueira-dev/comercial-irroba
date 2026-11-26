"use client";

import { useCallback, useState } from "react";
import { copyToClipboard } from "@/lib/client/clipboard";
import { useTimeout } from "@/lib/client/useTimeout";

/** Copia texto e marca a chave copiada por alguns segundos. Retorna false se a cópia falhar. */
export function useCopyToClipboard(resetMs = 2000) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { schedule } = useTimeout();
  const copy = useCallback(
    async (key: string, text: string) => {
      const ok = await copyToClipboard(text);
      if (ok) {
        setCopiedKey(key);
        schedule(() => setCopiedKey(null), resetMs);
      }
      return ok;
    },
    [resetMs, schedule]
  );
  return { copiedKey, copy };
}
