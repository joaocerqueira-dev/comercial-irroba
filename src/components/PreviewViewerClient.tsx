"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Columns2,
  MessageCircle,
  Monitor,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";
import StoreCompareView from "./StoreCompareView";
import { IrrobaLogo } from "./ui/IrrobaLogo";
import { Modal } from "./ui/Modal";

interface PreviewViewerClientProps {
  slug: string;
  storeName: string;
  sourceUrl: string;
  detectedPlatform: string;
  screenshotPath: string | null;
  fullScreenshotPath: string | null;
  mobileScreenshotPath?: string | null;
  mobileFullScreenshotPath?: string | null;
  sellerWhatsapp: string | null;
}

export default function PreviewViewerClient({
  slug,
  storeName,
  sourceUrl,
  detectedPlatform,
  screenshotPath,
  fullScreenshotPath,
  mobileScreenshotPath = null,
  mobileFullScreenshotPath = null,
  sellerWhatsapp,
}: PreviewViewerClientProps) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [showCompare, setShowCompare] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  const handleApproveClick = () => {
    if (sellerWhatsapp) {
      const msg = encodeURIComponent(
        `Olá! Vi a prévia beta da minha loja "${storeName}" na plataforma Irroba e quero saber os próximos passos para migração.`
      );
      window.open(`https://wa.me/${sellerWhatsapp}?text=${msg}`, "_blank", "noopener,noreferrer");
    } else {
      setShowContactModal(true);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-irroba-surface">
      {/* Top Commercial Bar — Padrão Claro Irroba BrandBook 2026 */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-2.5 text-irroba-ink shadow-sm">
        <div className="flex items-center gap-3.5">
          <IrrobaLogo variant="primary" theme="light" className="h-7 w-auto sm:h-8" />
          <span className="hidden h-6 w-px bg-zinc-200 sm:block" aria-hidden="true" />
          <div>
            <div className="flex items-center gap-1.5 font-heading text-xs font-bold text-irroba-ink sm:text-sm">
              <Sparkles className="h-3.5 w-3.5 text-brand-500" />
              <span>
                Prévia da sua loja na <span className="text-brand-500">Irroba</span> · {storeName}
              </span>
            </div>
            <div className="text-xs text-zinc-500">
              Sua loja reimaginada na plataforma Irroba
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Dispositivo da prévia"
            className={`hidden items-center gap-1 rounded-xl border border-zinc-200 bg-irroba-surface p-0.5 ${showCompare ? "" : "sm:flex"}`}
          >
            <button
              type="button"
              onClick={() => setDevice("desktop")}
              aria-pressed={device === "desktop"}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                device === "desktop"
                  ? "bg-white text-irroba-ink shadow-sm"
                  : "text-zinc-600 hover:text-irroba-ink"
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setDevice("mobile")}
              aria-pressed={device === "mobile"}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                device === "mobile"
                  ? "bg-white text-irroba-ink shadow-sm"
                  : "text-zinc-600 hover:text-irroba-ink"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              Mobile
            </button>
          </div>

          {!showCompare && (fullScreenshotPath || screenshotPath) && (
            <button
              type="button"
              onClick={() => setShowCompare((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-heading text-xs font-semibold transition ${
                showCompare
                  ? "border-brand-300 bg-brand-50 text-brand-700"
                  : "border-zinc-200 bg-white text-irroba-ink hover:border-brand-200 hover:bg-brand-50/50"
              }`}
            >
              <Columns2 className="h-3.5 w-3.5 text-brand-500" />
              Comparar Atual vs. Irroba
            </button>
          )}

          <button
            type="button"
            onClick={handleApproveClick}
            className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-1.5 font-heading text-xs font-bold text-white shadow-sm transition hover:bg-brand-600 active:bg-brand-800"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Gostei, quero migrar
          </button>
        </div>
      </header>

      {/* Main Viewport: Full-Height Scrollable Split Compare OR Single Storefront */}
      {showCompare ? (
        <main className="flex min-h-0 flex-1 overflow-hidden">
          <StoreCompareView
            slug={slug}
            storeName={storeName}
            sourceUrl={sourceUrl}
            detectedPlatform={detectedPlatform}
            fullScreenshotPath={fullScreenshotPath}
            screenshotPath={screenshotPath}
            mobileFullScreenshotPath={mobileFullScreenshotPath}
            mobileScreenshotPath={mobileScreenshotPath}
            device={device}
            onDeviceChange={setDevice}
            proposalSrc={`/render/${slug}`}
            onClose={() => setShowCompare(false)}
          />
        </main>
      ) : (
        <main className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-zinc-200/70 p-0 sm:p-2.5">
          <iframe
            src={`/render/${slug}`}
            title={`Prévia Irroba - ${storeName}`}
            className={`h-full bg-white shadow-2xl transition-all duration-300 ${
              device === "mobile"
                ? "w-[390px] rounded-[28px] border-8 border-irroba-ink"
                : "w-full sm:rounded-xl"
            }`}
          />
        </main>
      )}

      {/* Fallback quando não há WhatsApp do consultor */}
      <Modal
        open={showContactModal}
        onClose={() => setShowContactModal(false)}
        title="Gostou? Fale com seu consultor"
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand-600">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            <span className="font-heading text-sm font-bold text-irroba-ink">
              Gostou? Fale com seu consultor
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowContactModal(false)}
            aria-label="Fechar"
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-zinc-600">
          A estrutura visual de <strong>{storeName}</strong> já está pronta para a Irroba, com catálogo
          preparado para a migração assistida.
        </p>
        <div className="mt-4 rounded-xl border border-brand-200/60 bg-brand-50/60 p-3 text-xs text-zinc-700">
          Responda ao consultor da Irroba que enviou este link para iniciar sua migração.
        </div>
        <button
          type="button"
          onClick={() => setShowContactModal(false)}
          className="mt-5 min-h-[44px] w-full rounded-xl bg-brand-500 py-2.5 font-heading text-sm font-bold text-white shadow-sm transition hover:bg-brand-600 active:bg-brand-800"
        >
          Continuar explorando a prévia
        </button>
      </Modal>
    </div>
  );
}
