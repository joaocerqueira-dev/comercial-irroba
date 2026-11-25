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
  const mobileCaptureAbortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      if (lockTimerRef.current) window.clearTimeout(lockTimerRef.current);
    },
    []
  );

  // Captura mobile em andamento é cancelada no unmount ou quando o slug muda
  useEffect(
    () => () => {
      mobileCaptureAbortRef.current?.abort();
      mobileCaptureAbortRef.current = null;
    },
    [slug]
  );

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
      mobileCaptureAbortRef.current?.abort();
      const controller = new AbortController();
      mobileCaptureAbortRef.current = controller;
      setIsCapturingMobile(true);
      setMobileCaptureFailed(false);
      try {
        const res = await fetch(`/api/captures/mobile/${encodeURIComponent(slug)}`, {
          method: "POST",
          signal: controller.signal,
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
        if (controller.signal.aborted) {
          // Abortada: permite nova tentativa se voltar a este slug
          attemptedMobileSlugsRef.current.delete(slug);
          return;
        }
        setMobileCaptureFailed(true);
      } finally {
        if (mobileCaptureAbortRef.current === controller) mobileCaptureAbortRef.current = null;
        // Só a requisição mais recente controla o spinner
        if (mobileCaptureAbortRef.current === null) setIsCapturingMobile(false);
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
    <div className="flex h-full min-h-0 flex-1 flex-col bg-irroba-surface text-irroba-ink">
      {/* Toolbar — Padrão Claro Irroba BrandBook 2026 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-white px-4 py-2.5 text-xs">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="font-heading font-bold text-irroba-ink">
            Comparativo <span className="text-brand-500">Completo</span>
          </span>
          <span className="hidden text-zinc-500 lg:inline">
            Role para comparar a loja inteira do cabeçalho ao rodapé
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Desktop vs Mobile Toggle */}
          <div
            role="group"
            aria-label="Dispositivo do comparativo"
            className="flex items-center gap-0.5 rounded-xl border border-zinc-200 bg-irroba-surface p-0.5"
          >
            <button
              type="button"
              onClick={() => setCurrentDevice("desktop")}
              aria-pressed={currentDevice === "desktop"}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                currentDevice === "desktop"
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-zinc-600 hover:text-irroba-ink"
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setCurrentDevice("mobile")}
              aria-pressed={currentDevice === "mobile"}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                currentDevice === "mobile"
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-zinc-600 hover:text-irroba-ink"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              Mobile
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSyncScroll((s) => !s)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold transition ${
              syncScroll
                ? "border-brand-200 bg-brand-50 text-brand-700"
                : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {syncScroll ? <Link2 className="h-3.5 w-3.5" /> : <Link2Off className="h-3.5 w-3.5" />}
            {syncScroll ? "Rolagem Sincronizada" : "Rolagem Independente"}
          </button>

          {currentDevice === "desktop" && (
            <button
              type="button"
              onClick={() => setFitDesktop((f) => !f)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold transition ${
                fitDesktop
                  ? "border-zinc-300 bg-zinc-100 text-irroba-ink"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
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
            className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            <ArrowUpToLine className="h-3.5 w-3.5" />
            Topo
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-xl bg-irroba-ink px-2.5 py-1 text-xs font-semibold text-white hover:bg-zinc-800"
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
        <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-zinc-400" />
              <span className="truncate font-heading font-bold text-irroba-ink">
                Site Atual ({detectedPlatform}) · {currentDevice === "mobile" ? "Mobile" : "Desktop"}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {currentDevice === "mobile" && mobileCaptureFailed && slug && (
                <button
                  type="button"
                  onClick={() => void requestMobileCapture(true)}
                  disabled={isCapturingMobile}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${isCapturingMobile ? "animate-spin" : ""}`} />
                  Recapturar Mobile
                </button>
              )}
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-brand-600"
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
                <div className="flex h-full flex-col items-center justify-center p-8 text-center text-sm text-zinc-500">
                  <p className="font-semibold text-zinc-700">Captura da loja atual indisponível</p>
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 text-xs font-semibold text-brand-600 underline"
                  >
                    Abrir {sourceUrl} em nova aba
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-zinc-100 p-3">
              <div
                style={{
                  width: `${mobileOuterWidth}px`,
                  height: mobileScale < 1 ? `${100 / mobileScale}%` : "100%",
                  transform: mobileScale < 1 ? `scale(${mobileScale})` : undefined,
                  transformOrigin: "top center",
                }}
                className="flex max-h-full flex-col overflow-hidden rounded-[30px] border-[8px] border-irroba-ink bg-white shadow-xl"
              >
                {/* Smartphone top speaker bar */}
                <div className="flex h-5 shrink-0 items-center justify-center bg-irroba-ink">
                  <span className="h-1.5 w-16 rounded-full bg-zinc-700" />
                </div>

                {isCapturingMobile && !mobileImgSrc && (
                  <div className="flex shrink-0 items-center justify-center gap-1.5 border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-900">
                    <Loader2 className="h-3 w-3 animate-spin text-amber-600" />
                    <span>Capturando visualização mobile real da loja atual...</span>
                  </div>
                )}

                {!mobileImgSrc && !isCapturingMobile && imgSrc && (
                  <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-medium text-zinc-600">
                    <span>Captura adaptada</span>
                    {slug && (
                      <button
                        type="button"
                        onClick={() => void requestMobileCapture(true)}
                        className="font-semibold text-brand-600 hover:underline"
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
                    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-xs text-zinc-500">
                      <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
                      <p className="font-semibold text-zinc-700">
                        Carregando versão mobile de {storeName}...
                      </p>
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center p-6 text-center text-sm text-zinc-500">
                      <p className="font-semibold text-zinc-700">Captura mobile indisponível</p>
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 text-xs font-semibold text-brand-600 underline"
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
        <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-brand-200 bg-white shadow-sm">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-brand-200/70 bg-brand-50 px-3.5 py-2 text-xs">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />
              <span className="truncate font-heading font-bold text-brand-800">
                Proposta Irroba · Tema LIME ({currentDevice === "mobile" ? "Mobile" : "Interativo"})
              </span>
            </div>
            <span className="shrink-0 rounded-lg bg-brand-500 px-2 py-0.5 font-heading text-[11px] font-bold text-white">
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
              className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-brand-50/40 p-3"
            >
              <div
                style={{
                  width: `${mobileOuterWidth}px`,
                  height: mobileScale < 1 ? `${100 / mobileScale}%` : "100%",
                  transform: mobileScale < 1 ? `scale(${mobileScale})` : undefined,
                  transformOrigin: "top center",
                }}
                className="flex max-h-full flex-col overflow-hidden rounded-[30px] border-[8px] border-irroba-ink bg-white shadow-xl ring-1 ring-brand-500/30"
              >
                {/* Smartphone top speaker bar */}
                <div className="flex h-5 shrink-0 items-center justify-center bg-irroba-ink">
                  <span className="h-1.5 w-16 rounded-full bg-zinc-700" />
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
