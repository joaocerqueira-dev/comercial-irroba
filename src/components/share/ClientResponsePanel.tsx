"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buildWhatsappLink, formatResponseStatus, type ResponseType } from "@/lib/share/responses";

export interface LatestResponse {
  type: ResponseType;
  clientName: string;
  message: string | null;
  createdAt: string;
}

const OPTIONS: { type: ResponseType; label: string; cls: string }[] = [
  { type: "aprovar", label: "Aprovar", cls: "bg-brand-500 text-white hover:bg-brand-600" },
  { type: "ajustes", label: "Pedir ajustes", cls: "border border-zinc-300 bg-white text-irroba-ink hover:bg-zinc-50" },
  { type: "recusar", label: "Recusar", cls: "border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50" },
];

export default function ClientResponsePanel({
  slug,
  storeName,
  sellerWhatsapp,
  shareStatus,
  response,
}: {
  slug: string;
  storeName: string;
  sellerWhatsapp: string | null;
  shareStatus: string;
  response: LatestResponse | null;
}) {
  const router = useRouter();
  const [type, setType] = useState<ResponseType | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (shareStatus !== "pendente") {
    const wa = response ? buildWhatsappLink(sellerWhatsapp, response.type, storeName, response.message) : null;
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 bg-white px-4 py-2.5 text-sm">
        <span className="font-semibold text-irroba-ink">
          {response
            ? formatResponseStatus({ ...response, createdAt: new Date(response.createdAt) })
            : "Esta proposta já foi respondida."}
        </span>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-brand-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-600">
            Avisar pelo WhatsApp
          </a>
        )}
      </div>
    );
  }

  async function send() {
    if (!type) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/share/${slug}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, clientName: name, message }),
      });
      if (res.ok || res.status === 409) return router.refresh();
      setError(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Não foi possível enviar.");
    } catch {
      setError("Não foi possível enviar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-zinc-200 bg-white px-4 py-2.5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 font-semibold text-irroba-ink">O que você achou da proposta?</span>
        {OPTIONS.map((o) => (
          <button
            key={o.type}
            type="button"
            onClick={() => setType(o.type)}
            aria-pressed={type === o.type}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold ${o.cls} ${type === o.type ? "ring-2 ring-brand-500" : ""}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {type && (
        <form
          className="mt-2 flex flex-wrap items-start gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
            placeholder="Seu nome"
            aria-label="Seu nome"
            className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm"
          />
          {type !== "aprovar" && (
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              required={type === "ajustes"}
              minLength={type === "ajustes" ? 3 : undefined}
              rows={2}
              placeholder={type === "ajustes" ? "O que você quer ajustar?" : "Motivo (opcional)"}
              aria-label="Mensagem"
              className="min-w-[220px] flex-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm"
            />
          )}
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-irroba-ink px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          >
            {busy ? "Enviando…" : "Enviar resposta"}
          </button>
        </form>
      )}
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
