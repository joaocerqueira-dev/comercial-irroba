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

interface PreviewViewerClientProps {
  slug: string;
  storeName: string;
  sourceUrl: string;
  detectedPlatform: string;
  screenshotPath: string | null;
  sellerWhatsapp: string | null;
}

export default function PreviewViewerClient({
  slug,
  storeName,
  sourceUrl,
  detectedPlatform,
  screenshotPath,
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

          {screenshotPath && (
            <button
              type="button"
              onClick={() => setShowCompare(true)}
              className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
            >
              <Columns2 className="h-3.5 w-3.5 text-emerald-400" />
              Comparar Atual vs. Irroba
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

      {/* Isolated Storefront Iframe */}
      <main className="flex flex-1 items-center justify-center overflow-hidden bg-slate-800 p-0 sm:p-2">
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

      {/* Compare Modal */}
      {showCompare && screenshotPath && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-900 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
              <div>
                <h2 className="text-sm font-bold">Comparativo Visual: Site Atual vs. Irroba (LIME)</h2>
                <p className="text-xs text-slate-400">{sourceUrl}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCompare(false)}
                className="rounded-lg bg-white/10 p-1.5 hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid flex-1 gap-4 overflow-y-auto p-5 md:grid-cols-2">
              <div className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-950">
                <div className="border-b border-white/10 px-3 py-2 text-xs font-semibold text-slate-300">
                  Site Atual ({detectedPlatform})
                </div>
                <div className="flex-1 overflow-auto bg-white">
                  <img src={screenshotPath} alt="Site atual" className="w-full object-contain" />
                </div>
              </div>
              <div className="flex flex-col overflow-hidden rounded-xl border border-emerald-500/40 bg-slate-950">
                <div className="border-b border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
                  Nova Experiência na Irroba (Interativo)
                </div>
                <iframe
                  src={`/render/${slug}`}
                  title="Comparativo Irroba"
                  className="min-h-[420px] flex-1 bg-white"
                />
              </div>
            </div>
          </div>
        </div>
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
