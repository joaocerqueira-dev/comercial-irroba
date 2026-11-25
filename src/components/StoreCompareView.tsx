"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpToLine,
  ExternalLink,
  Link2,
  Link2Off,
  Loader2,
  Maximize2,
  Minimize2,
  Monitor,
  RefreshCw,
  Smartphone,
  X,
} from "lucide-react";

interface StoreCompareViewProps {
  slug?: string;
  storeName: string;
  sourceUrl: string;
  detectedPlatform: string;
  fullScreenshotPath: string | null;
  screenshotPath: string | null;
  mobileFullScreenshotPath?: string | null;
  mobileScreenshotPath?: string | null;
  device?: "desktop" | "mobile";
  onDeviceChange?: (next: "desktop" | "mobile") => void;
  proposalSrc?: string;
  proposalSrcDoc?: string;
  onClose?: () => void;
}

const DESKTOP_TARGET_WIDTH = 1280;
const MOBILE_TARGET_WIDTH = 390;

export default function StoreCompareView({
  slug,
  storeName,
  sourceUrl,
  detectedPlatform,
  fullScreenshotPath,
  screenshotPath,
  mobileFullScreenshotPath = null,
  mobileScreenshotPath = null,
  device,
  onDeviceChange,
  proposalSrc,
  proposalSrcDoc,
  onClose,
}: StoreCompareViewProps) {
  const [internalDevice, setInternalDevice] = useState<"desktop" | "mobile">(device ?? "desktop");
  const currentDevice = device ?? internalDevice;

  const setCurrentDevice = (next: "desktop" | "mobile") => {
    setInternalDevice(next);
    onDeviceChange?.(next);
  };

  const [imgSrc, setImgSrc] = useState<string | null>(fullScreenshotPath || screenshotPath);
  const [mobileImgSrc, setMobileImgSrc] = useState<string | null>(
    mobileFullScreenshotPath || mobileScreenshotPath
  );
  const [isCapturingMobile, setIsCapturingMobile] = useState(false);
  const [mobileCaptureFailed, setMobileCaptureFailed] = useState(false);
  const attemptedMobileSlugsRef = useRef<Set<string>>(new Set());

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

  useEffect(() => {
    setMobileImgSrc(mobileFullScreenshotPath || mobileScreenshotPath);
  }, [mobileFullScreenshotPath, mobileScreenshotPath]);

  const requestMobileCapture = useCallback(
    async (force = false) => {
      if (!slug) return;
      if (!force && attemptedMobileSlugsRef.current.has(slug)) return;
      attemptedMobileSlugsRef.current.add(slug);
      setIsCapturingMobile(true);
      setMobileCaptureFailed(false);
      try {
        const res = await fetch(`/api/captures/mobile/${encodeURIComponent(slug)}`, {
          method: "POST",
        });
        if (!res.ok) {
          setMobileCaptureFailed(true);
          return;
        }
        const data = (await res.json()) as {
          mobileFullScreenshotPath?: string;
          mobileScreenshotPath?: string;
        };
        const resolved = data.mobileFullScreenshotPath || data.mobileScreenshotPath || null;
        if (resolved) {
          setMobileImgSrc(resolved);
          setMobileCaptureFailed(false);
        } else {
          setMobileCaptureFailed(true);
        }
      } catch {
        setMobileCaptureFailed(true);
      } finally {
        setIsCapturingMobile(false);
      }
    },
    [slug]
  );

  useEffect(() => {
    if (currentDevice === "mobile" && !mobileImgSrc && slug) {
      void requestMobileCapture(false);
    }
  }, [currentDevice, mobileImgSrc, slug, requestMobileCapture]);

  // Measure right panel width so Desktop 1280px or Mobile 390px scales proportionally without overflow
  useEffect(() => {
    const el = rightContainerRef.current;
    if (!el) return;
    const update = () => setRightWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [currentDevice]);

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
  const syncScrollRef = useRef(syncScroll);
  useEffect(() => {
    syncScrollRef.current = syncScroll;
  }, [syncScroll]);
  const iframeCleanupRef = useRef<(() => void) | null>(null);

  const attachIframeScrollListener = useCallback(() => {
    iframeCleanupRef.current?.();
    iframeCleanupRef.current = null;
    const win = iframeRef.current?.contentWindow;
    const doc = iframeRef.current?.contentDocument;
    if (!win || !doc) return;

    const onRightScroll = () => {
      if (!syncScrollRef.current || scrollLockRef.current === "left") return;
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
    iframeCleanupRef.current = () => {
      try {
        win.removeEventListener("scroll", onRightScroll);
      } catch {
        // ignore detached iframe
      }
    };
  }, [releaseLockSoon]);

  useEffect(() => {
    attachIframeScrollListener();
    return () => {
      iframeCleanupRef.current?.();
      iframeCleanupRef.current = null;
    };
  }, [attachIframeScrollListener, proposalSrc, proposalSrcDoc, currentDevice]);

  const scrollBothToTop = () => {
    leftScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    try {
      iframeRef.current?.contentWindow?.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      // ignore
    }
  };

  const desktopScale =
    fitDesktop && rightWidth > 0 && rightWidth < DESKTOP_TARGET_WIDTH
      ? rightWidth / DESKTOP_TARGET_WIDTH
      : 1;

  // Phone frame outer width = 390 + 16px bezel = 406px
  const mobileOuterWidth = MOBILE_TARGET_WIDTH + 16;
  const mobileScale =
    rightWidth > 0 && rightWidth < mobileOuterWidth + 24
      ? Math.max(0.55, (rightWidth - 24) / mobileOuterWidth)
      : 1;

  const activeLeftMobileImg = mobileImgSrc || imgSrc;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-slate-900 text-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-slate-950/90 px-4 py-2 text-xs">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="font-bold text-white">Comparativo Completo</span>
          <span className="hidden text-slate-400 lg:inline">
            Role para comparar a loja inteira do cabeçalho ao rodapé
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Desktop vs Mobile Toggle */}
          <div
            role="group"
            aria-label="Dispositivo do comparativo"
            className="flex items-center gap-0.5 rounded-lg border border-white/15 bg-white/5 p-0.5"
          >
            <button
              type="button"
              onClick={() => setCurrentDevice("desktop")}
              aria-pressed={currentDevice === "desktop"}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                currentDevice === "desktop"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setCurrentDevice("mobile")}
              aria-pressed={currentDevice === "mobile"}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                currentDevice === "mobile"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              Mobile
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSyncScroll((s) => !s)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
              syncScroll
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            {syncScroll ? <Link2 className="h-3.5 w-3.5" /> : <Link2Off className="h-3.5 w-3.5" />}
            {syncScroll ? "Rolagem Sincronizada" : "Rolagem Independente"}
          </button>

          {currentDevice === "desktop" && (
            <button
              type="button"
              onClick={() => setFitDesktop((f) => !f)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                fitDesktop
                  ? "border-sky-500/40 bg-sky-500/15 text-sky-300"
                  : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {fitDesktop ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              {fitDesktop ? "Desktop Ajustado" : "Largura Natural"}
            </button>
          )}

          <button
            aria-label="Voltar ao topo"
            type="button"
            onClick={scrollBothToTop}
            title="Voltar ao topo"
            className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-white/10"
          >
            <ArrowUpToLine className="h-3.5 w-3.5" />
            Topo
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20"
            >
              <X className="h-3.5 w-3.5" />
              Fechar Comparativo
            </button>
          )}
        </div>
      </div>

      {/* Split Scrollable Panes (Full Height) */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 md:grid-cols-2">
        {/* LEFT: Current Store (Desktop or Mobile) */}
        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/15 bg-slate-950 shadow-xl">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-slate-900 px-3.5 py-2 text-xs">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
              <span className="truncate font-bold text-slate-100">
                Site Atual ({detectedPlatform}) · {currentDevice === "mobile" ? "Mobile" : "Desktop"}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {currentDevice === "mobile" && mobileCaptureFailed && slug && (
                <button
                  type="button"
                  onClick={() => void requestMobileCapture(true)}
                  disabled={isCapturingMobile}
                  className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-xs font-semibold text-amber-300 hover:bg-white/15 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${isCapturingMobile ? "animate-spin" : ""}`} />
                  Recapturar Mobile
                </button>
              )}
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-white"
              >
                Abrir original
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {currentDevice === "desktop" ? (
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
          ) : (
            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-slate-900/90 p-3">
              <div
                style={{
                  width: `${mobileOuterWidth}px`,
                  height: mobileScale < 1 ? `${100 / mobileScale}%` : "100%",
                  transform: mobileScale < 1 ? `scale(${mobileScale})` : undefined,
                  transformOrigin: "top center",
                }}
                className="flex max-h-full flex-col overflow-hidden rounded-[30px] border-[8px] border-slate-950 bg-white shadow-2xl ring-1 ring-white/15"
              >
                {/* Smartphone top speaker bar */}
                <div className="flex h-5 shrink-0 items-center justify-center bg-slate-950">
                  <span className="h-1.5 w-16 rounded-full bg-slate-800" />
                </div>

                {isCapturingMobile && !mobileImgSrc && (
                  <div className="flex shrink-0 items-center justify-center gap-1.5 border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-900">
                    <Loader2 className="h-3 w-3 animate-spin text-amber-600" />
                    <span>Capturando visualização mobile real da loja atual...</span>
                  </div>
                )}

                {!mobileImgSrc && !isCapturingMobile && imgSrc && (
                  <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600">
                    <span>Captura adaptada</span>
                    {slug && (
                      <button
                        type="button"
                        onClick={() => void requestMobileCapture(true)}
                        className="font-semibold text-emerald-700 hover:underline"
                      >
                        Tentar captura mobile
                      </button>
                    )}
                  </div>
                )}

                <div
                  ref={leftScrollRef}
                  onScroll={handleLeftScroll}
                  className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-white"
                >
                  {activeLeftMobileImg ? (
                    <img
                      src={activeLeftMobileImg}
                      alt={`Página mobile atual de ${storeName}`}
                      onError={() => {
                        if (mobileImgSrc && mobileImgSrc !== mobileScreenshotPath && mobileScreenshotPath) {
                          setMobileImgSrc(mobileScreenshotPath);
                        } else if (mobileImgSrc) {
                          setMobileImgSrc(null);
                        } else if (imgSrc !== screenshotPath && screenshotPath) {
                          setImgSrc(screenshotPath);
                        }
                      }}
                      className="block h-auto w-full"
                    />
                  ) : isCapturingMobile ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-xs text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                      <p className="font-semibold text-slate-700">
                        Carregando versão mobile de {storeName}...
                      </p>
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center p-6 text-center text-sm text-slate-500">
                      <p className="font-semibold text-slate-700">Captura mobile indisponível</p>
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
              </div>
            </div>
          )}
        </section>

        {/* RIGHT: Interactive Irroba LIME Proposal (Desktop or Mobile) */}
        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-emerald-500/40 bg-slate-950 shadow-xl">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-emerald-500/20 bg-emerald-950/60 px-3.5 py-2 text-xs">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
              <span className="truncate font-bold text-emerald-200">
                Proposta Irroba · Tema LIME ({currentDevice === "mobile" ? "Mobile" : "Interativo"})
              </span>
            </div>
            <span className="shrink-0 rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
              {currentDevice === "mobile"
                ? `Mobile ${MOBILE_TARGET_WIDTH}px${mobileScale < 1 ? ` (${Math.round(mobileScale * 100)}%)` : ""}`
                : desktopScale < 1
                  ? `Desktop ${Math.round(desktopScale * 100)}%`
                  : "Desktop 100%"}
            </span>
          </div>

          {currentDevice === "desktop" ? (
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
                  desktopScale < 1
                    ? {
                        width: `${DESKTOP_TARGET_WIDTH}px`,
                        height: `${100 / desktopScale}%`,
                        transform: `scale(${desktopScale})`,
                        transformOrigin: "top left",
                      }
                    : { width: "100%", height: "100%" }
                }
                className="block border-0 bg-white"
              />
            </div>
          ) : (
            <div
              ref={rightContainerRef}
              className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-slate-900/90 p-3"
            >
              <div
                style={{
                  width: `${mobileOuterWidth}px`,
                  height: mobileScale < 1 ? `${100 / mobileScale}%` : "100%",
                  transform: mobileScale < 1 ? `scale(${mobileScale})` : undefined,
                  transformOrigin: "top center",
                }}
                className="flex max-h-full flex-col overflow-hidden rounded-[30px] border-[8px] border-slate-950 bg-white shadow-2xl ring-1 ring-emerald-400/30"
              >
                {/* Smartphone top speaker bar */}
                <div className="flex h-5 shrink-0 items-center justify-center bg-slate-950">
                  <span className="h-1.5 w-16 rounded-full bg-slate-800" />
                </div>

                <iframe
                  ref={iframeRef}
                  src={proposalSrc}
                  srcDoc={proposalSrcDoc}
                  onLoad={attachIframeScrollListener}
                  title={`Proposta Irroba LIME Mobile - ${storeName}`}
                  style={{ width: `${MOBILE_TARGET_WIDTH}px`, height: "100%" }}
                  className="block min-h-0 flex-1 border-0 bg-white"
                />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
