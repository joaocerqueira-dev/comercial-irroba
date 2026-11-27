"use client";

import { createContext, useContext } from "react";
import type { AiStatus } from "@/lib/ai/status";

/** IA configurada pelo usuário logado (só flags, nunca chaves). Padrão liberado fora do Studio. */
export const AiStatusContext = createContext<AiStatus>({ text: true, image: "google" });
export const useAiStatus = () => useContext(AiStatusContext);
