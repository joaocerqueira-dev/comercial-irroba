"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { IrrobaLogo } from "@/components/ui/IrrobaLogo";
import { Field } from "@/components/ui/Field";

const input = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900";

/** Pede a senha do link; no 200 o cookie já veio e o refresh mostra a proposta. */
export default function SharePasswordForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = new FormData(e.currentTarget).get("password");
    setBusy(true);
    setError("");
    const res = await fetch(`/api/share/${encodeURIComponent(slug)}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }).catch(() => null);
    if (res?.ok) {
      router.refresh();
      return;
    }
    const data = await res?.json().catch(() => null);
    setBusy(false);
    setError(data?.error ?? "Não foi possível abrir a proposta.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
        <IrrobaLogo />
        <p className="text-sm text-slate-700">Digite a senha que o seu comercial enviou para ver a proposta.</p>
        <Field label="Senha" labelClassName="block text-sm font-medium text-slate-700">
          <input name="password" type="password" required autoComplete="current-password" className={input} />
        </Field>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {busy ? "Abrindo..." : "Ver proposta"}
        </button>
      </form>
    </main>
  );
}
