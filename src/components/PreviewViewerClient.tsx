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

interface PreviewViewerClientProps {
  slug: string;
  storeName: string;
  sourceUrl: string;
  detectedPlatform: string;
  screenshotPath: string | null;
  fullScreenshotPath: string | null;
  sellerWhatsapp: string | null;
}

export default function PreviewViewerClient({
  slug,
  storeName,
  sourceUrl,
  detectedPlatform,
  screenshotPath,
  fullScreenshotPath,
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
    <div className="flex h-screen flex-col bg-slate-900">
      {/* Top Commercial Beta Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-950 px-4 py-2.5 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-xs font-extrabold text-slate-950">
            IR
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold sm:text-sm">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span>Prévia Beta na Irroba · {storeName}</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Layout adaptado ao Tema LIME (Origem: {detectedPlatform})
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-0.5 sm:flex">
            <button
              type="button"
              onClick={() => setDevice("desktop")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold ${
                device === "desktop" ? "bg-white text-slate-950" : "text-slate-300 hover:text-white"
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setDevice("mobile")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold ${
                device === "mobile" ? "bg-white text-slate-950" : "text-slate-300 hover:text-white"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              Mobile
            </button>
          </div>

          {(fullScreenshotPath || screenshotPath) && (
            <button
              type="button"
              onClick={() => setShowCompare((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                showCompare
                  ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-200"
                  : "border-white/15 bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              <Columns2 className="h-3.5 w-3.5 text-emerald-400" />
              {showCompare ? "Voltar ao Preview Único" : "Comparar Atual vs. Irroba"}
            </button>
          )}

          <button
            type="button"
            onClick={handleApproveClick}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Aprovar Layout &amp; Migrar
          </button>
        </div>
      </header>

      {/* Main Viewport: Full-Height Scrollable Split Compare OR Single Storefront */}
      {showCompare ? (
        <main className="flex min-h-0 flex-1 overflow-hidden">
          <StoreCompareView
            storeName={storeName}
            sourceUrl={sourceUrl}
            detectedPlatform={detectedPlatform}
            fullScreenshotPath={fullScreenshotPath}
            screenshotPath={screenshotPath}
            proposalSrc={`/render/${slug}`}
            onClose={() => setShowCompare(false)}
          />
        </main>
      ) : (
        <main className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-slate-800 p-0 sm:p-2">
          <iframe
            src={`/render/${slug}`}
            title={`Preview Beta Irroba - ${storeName}`}
            className={`h-full bg-white shadow-2xl transition-all duration-300 ${
              device === "mobile"
                ? "w-[390px] rounded-2xl border-8 border-slate-950"
                : "w-full sm:rounded-lg"
            }`}
          />
        </main>
      )}

      {/* Fallback Approve Modal when no WhatsApp is set */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-slate-900 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-bold">Layout Beta Aprovado!</span>
              </div>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-slate-600">
              A estrutura visual de <strong>{storeName}</strong> já está mapeada para o Tema LIME da
              Irroba, com blocos modulares e catálogo pronto para migração assistida.
            </p>
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
              Responda ao consultor da Irroba que lhe enviou este link informando a aprovação do
              layout para iniciar sua migração.
            </div>
            <button
              type="button"
              onClick={() => setShowContactModal(false)}
              className="mt-5 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-500"
            >
              Continuar explorando o Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
