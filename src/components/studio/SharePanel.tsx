"use client";

import { useCallback, useEffect, useState } from "react";
import { useCopyToClipboard } from "@/components/ui/useCopyToClipboard";
import { formatResponseStatus, type ResponseType } from "@/lib/share/responses";
import { shareBadgeLabel } from "@/lib/share/badge";

interface ShareState {
  shareExpiresAt: string | null;
  hasPassword: boolean;
  legacyPublic: boolean;
  shareStatus: string;
  contentVersion: number;
  responses: {
    id: string;
    type: ResponseType;
    clientName: string;
    message: string | null;
    contentVersion: number;
    createdAt: string;
  }[];
}

const OPTIONS = ["7", "15", "30", "custom"] as const;

/** Painel do comercial: validade, senha, link do cliente e histórico de respostas. */
export function SharePanel({ previewId, slug }: { previewId: string; slug: string }) {
  const endpoint = `/api/previews/${previewId}/share`;
  const [state, setState] = useState<ShareState | null>(null);
  const [days, setDays] = useState<(typeof OPTIONS)[number]>("7");
  const [date, setDate] = useState("");
  const [password, setPassword] = useState("");
  const [change, setChange] = useState(false);
  const [fresh, setFresh] = useState<{ password: string } | null>(null);
  const [kept, setKept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { copiedKey, copy } = useCopyToClipboard();

  const load = useCallback(async () => {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error();
      setState(await res.json());
    } catch {
      setError("Não foi possível carregar o compartilhamento.");
    }
  }, [endpoint]);

  useEffect(() => {
    void load();
  }, [load]);

  const link = () => `${window.location.origin}/preview/${slug}`;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const body: { days?: number; expiresAt?: string; password?: string; regenerate?: boolean } =
        days === "custom" ? { expiresAt: date } : { days: Number(days) };
      if (password) body.password = password;
      else if (change) body.regenerate = true;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível salvar o link.");
      setFresh(data.password ? { password: data.password } : null);
      setKept(!data.password);
      setPassword("");
      setChange(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar o link.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setFresh(null);
      setKept(false);
      await load();
    } catch {
      setError("Não foi possível desativar o link.");
    } finally {
      setBusy(false);
    }
  };

  const today = new Date();
  const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const minDate = ymd(today);
  const maxDate = ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 179));
  const btn = "rounded-xl px-3 py-2 text-xs font-semibold transition disabled:opacity-50";

  return (
    <div className="space-y-4 text-sm">
      <h2 className="font-heading text-base font-bold text-irroba-ink">Compartilhar com o cliente</h2>
      {state && (
        <p className="text-xs text-zinc-600">
          Status: <strong>{shareBadgeLabel(state)}</strong>
          {state.shareExpiresAt &&
            ` · válido até ${new Date(state.shareExpiresAt).toLocaleDateString("pt-BR")}`}
        </p>
      )}

      <fieldset className="flex flex-wrap gap-3 text-xs">
        <legend className="mb-1 font-semibold text-zinc-700">Validade</legend>
        {OPTIONS.map((o) => (
          <label key={o} className="flex items-center gap-1">
            <input type="radio" name="validade" checked={days === o} onChange={() => setDays(o)} />
            {o === "custom" ? "Data personalizada" : `${o} dias`}
          </label>
        ))}
      </fieldset>
      {days === "custom" && (
        <input
          type="date"
          min={minDate}
          max={maxDate}
          aria-label="Data de validade"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-zinc-300 px-2 py-1 text-xs"
        />
      )}
      {state?.hasPassword && (
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={change} onChange={(e) => setChange(e.target.checked)} />
          Trocar senha
        </label>
      )}
      {(!state?.hasPassword || change) && (
        <input
          type="text"
          aria-label="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Deixe em branco para gerar"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs"
        />
      )}
      {kept && <p className="text-xs text-zinc-600">Senha mantida.</p>}

      {fresh && (
        <div className="rounded-xl bg-brand-50 p-3 text-xs">
          <p>
            Link: <span className="break-all">{link()}</span>
          </p>
          <p>
            Senha: <code className="font-bold">{fresh.password}</code>
          </p>
          <p className="mt-1 text-zinc-600">A senha só aparece agora. Para trocar, salve uma nova.</p>
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={save} disabled={busy || (days === "custom" && !date)} className={`${btn} bg-brand-600 text-white hover:bg-brand-700`}>
          Salvar link
        </button>
        <button type="button" onClick={disable} disabled={busy} className={`${btn} border border-zinc-300 text-zinc-700 hover:bg-zinc-100`}>
          Desativar link
        </button>
        <button type="button" onClick={() => copy("link", link())} className={`${btn} border border-zinc-300 text-zinc-700 hover:bg-zinc-100`}>
          {copiedKey === "link" ? "Link copiado!" : "Copiar link"}
        </button>
        <button
          type="button"
          disabled={!fresh}
          onClick={() => fresh && copy("both", `Link: ${link()}\nSenha: ${fresh.password}`)}
          className={`${btn} border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100`}
        >
          {copiedKey === "both" ? "Copiado!" : "Copiar link e senha"}
        </button>
      </div>

      {state && state.responses.length > 0 && (
        <section>
          <h3 className="mb-1 text-xs font-bold text-zinc-700">Respostas do cliente</h3>
          <ul className="max-h-48 space-y-2 overflow-y-auto">
            {state.responses.map((r) => (
              <li key={r.id} className="rounded-lg border border-zinc-200 p-2 text-xs">
                <p className="font-semibold">
                  {formatResponseStatus({ type: r.type, clientName: r.clientName, createdAt: new Date(r.createdAt) })}
                </p>
                {r.message && <p className="text-zinc-700">{r.message}</p>}
                <p className="text-zinc-500">Versão {r.contentVersion}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
