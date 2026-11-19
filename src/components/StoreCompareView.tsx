"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpToLine,
  ExternalLink,
  Link2,
  Link2Off,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";

interface StoreCompareViewProps {
  storeName: string;
  sourceUrl: string;
  detectedPlatform: string;
  fullScreenshotPath: string | null;
  screenshotPath: string | null;
  proposalSrc?: string;
  proposalSrcDoc?: string;
  onClose?: () => void;
}

const DESKTOP_TARGET_WIDTH = 1280;

export default function StoreCompareView({
  storeName,
  sourceUrl,
  detectedPlatform,
  fullScreenshotPath,
  screenshotPath,
  proposalSrc,
  proposalSrcDoc,
  onClose,
}: StoreCompareViewProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(fullScreenshotPath || screenshotPath);
  const [syncScroll, setSyncScroll] = useState(true);
  const [fitDesktop, setFitDesktop] = useState(true);
  const [rightWidth, setRightWidth] = useState(0);

  const leftScrollRef = useRef<HTMLDivElement | null>(null);
  const rightContainerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const scrollLockRef = useRef<"left" | "right" | null>(null);
  const lockTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setImgSrc(fullScreenshotPath || screenshotPath);
  }, [fullScreenshotPath, screenshotPath]);

  // Measure right panel width so Desktop 1280px scales proportionally without triggering mobile breakpoints
  useEffect(() => {
    const el = rightContainerRef.current;
    if (!el) return;
    const update = () => setRightWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const releaseLockSoon = useCallback(() => {
    if (lockTimerRef.current) window.clearTimeout(lockTimerRef.current);
    lockTimerRef.current = window.setTimeout(() => {
      scrollLockRef.current = null;
    }, 100);
  }, []);

  const handleLeftScroll = useCallback(() => {
    if (!syncScroll || scrollLockRef.current === "right") return;
    const leftEl = leftScrollRef.current;
    const win = iframeRef.current?.contentWindow;
    const doc = iframeRef.current?.contentDocument;
    if (!leftEl || !win || !doc) return;

    const leftMax = leftEl.scrollHeight - leftEl.clientHeight;
    if (leftMax <= 0) return;
    const pct = leftEl.scrollTop / leftMax;

    const docEl = doc.documentElement;
    const rightMax = (docEl?.scrollHeight || doc.body?.scrollHeight || 0) - win.innerHeight;
    if (rightMax <= 0) return;

    scrollLockRef.current = "left";
    win.scrollTo({ top: Math.round(pct * rightMax), behavior: "auto" });
    releaseLockSoon();
  }, [syncScroll, releaseLockSoon]);

  // Bind reverse scroll sync (right iframe -> left full-page screenshot)
  const attachIframeScrollListener = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    const doc = iframeRef.current?.contentDocument;
    if (!win || !doc) return;

    const onRightScroll = () => {
      if (!syncScroll || scrollLockRef.current === "left") return;
      const leftEl = leftScrollRef.current;
      if (!leftEl) return;

      const docEl = doc.documentElement;
      const rightMax = (docEl?.scrollHeight || doc.body?.scrollHeight || 0) - win.innerHeight;
      if (rightMax <= 0) return;
      const pct = win.scrollY / rightMax;

      const leftMax = leftEl.scrollHeight - leftEl.clientHeight;
      if (leftMax <= 0) return;

      scrollLockRef.current = "right";
      leftEl.scrollTop = Math.round(pct * leftMax);
      releaseLockSoon();
    };

    win.addEventListener("scroll", onRightScroll, { passive: true });
    return () => {
      try {
        win.removeEventListener("scroll", onRightScroll);
      } catch {
        // ignore detached iframe
      }
    };
  }, [syncScroll, releaseLockSoon]);

  useEffect(() => {
    const cleanup = attachIframeScrollListener();
    return () => {
      if (cleanup) cleanup();
    };
  }, [attachIframeScrollListener, proposalSrc, proposalSrcDoc]);

  const scrollBothToTop = () => {
    leftScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    try {
      iframeRef.current?.contentWindow?.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      // ignore
    }
  };

  const scale =
    fitDesktop && rightWidth > 0 && rightWidth < DESKTOP_TARGET_WIDTH
      ? rightWidth / DESKTOP_TARGET_WIDTH
      : 1;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-slate-900 text-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-slate-950/90 px-4 py-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-white">Comparativo Completo</span>
          <span className="hidden text-slate-400 sm:inline">
            Role para comparar a loja inteira do cabeçalho ao rodapé
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSyncScroll((s) => !s)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
              syncScroll
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            {syncScroll ? <Link2 className="h-3.5 w-3.5" /> : <Link2Off className="h-3.5 w-3.5" />}
            {syncScroll ? "Rolagem Sincronizada" : "Rolagem Independente"}
          </button>

          <button
            type="button"
            onClick={() => setFitDesktop((f) => !f)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
              fitDesktop
                ? "border-sky-500/40 bg-sky-500/15 text-sky-300"
                : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            {fitDesktop ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            {fitDesktop ? "Desktop Ajustado" : "Largura Natural"}
          </button>

          <button
            type="button"
            onClick={scrollBothToTop}
            title="Voltar ao topo"
            className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-white/10"
          >
            <ArrowUpToLine className="h-3.5 w-3.5" />
            Topo
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-white/20"
            >
              <X className="h-3.5 w-3.5" />
              Fechar Comparativo
            </button>
          )}
        </div>
      </div>

      {/* Split Scrollable Panes (Full Height) */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 md:grid-cols-2">
        {/* LEFT: Current Store Full-Page Scrollable Screenshot */}
        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/15 bg-slate-950 shadow-xl">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-slate-900 px-3.5 py-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
              <span className="truncate font-bold text-slate-100">
                Site Atual ({detectedPlatform})
              </span>
            </div>
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-white"
            >
              Abrir original
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div
            ref={leftScrollRef}
            onScroll={handleLeftScroll}
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-white"
          >
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={`Página completa atual de ${storeName}`}
                onError={() => {
                  if (imgSrc !== screenshotPath && screenshotPath) {
                    setImgSrc(screenshotPath);
                  }
                }}
                className="block h-auto w-full"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center text-sm text-slate-500">
                <p className="font-semibold text-slate-700">Captura da loja atual indisponível</p>
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 text-xs text-emerald-600 underline"
                >
                  Abrir {sourceUrl} em nova aba
                </a>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT: Interactive Irroba LIME Proposal (Full Scrollable + Proportional Desktop) */}
        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-emerald-500/40 bg-slate-950 shadow-xl">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-emerald-500/20 bg-emerald-950/60 px-3.5 py-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
              <span className="truncate font-bold text-emerald-200">
                Proposta Irroba · Tema LIME (Interativo)
              </span>
            </div>
            <span className="shrink-0 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              {scale < 1 ? `Desktop ${Math.round(scale * 100)}%` : "100%"}
            </span>
          </div>

          <div
            ref={rightContainerRef}
            className="relative min-h-0 flex-1 overflow-hidden bg-white"
          >
            <iframe
              ref={iframeRef}
              src={proposalSrc}
              srcDoc={proposalSrcDoc}
              onLoad={attachIframeScrollListener}
              title={`Proposta Irroba LIME - ${storeName}`}
              style={
                scale < 1
                  ? {
                      width: `${DESKTOP_TARGET_WIDTH}px`,
                      height: `${100 / scale}%`,
                      transform: `scale(${scale})`,
                      transformOrigin: "top left",
                    }
                  : { width: "100%", height: "100%" }
              }
              className="block border-0 bg-white"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
