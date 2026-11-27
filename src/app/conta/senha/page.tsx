"use client";

import { useState, type FormEvent } from "react";
import { Field } from "@/components/ui/Field";

const input = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900";
const label = "block text-sm font-medium text-slate-700";

export default function SenhaPage() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("newPassword") !== f.get("confirm")) return setError("A confirmação não confere com a nova senha.");
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: f.get("currentPassword"), newPassword: f.get("newPassword") }),
    }).catch(() => null);
    if (res?.ok) return window.location.assign("/");
    setBusy(false);
    setError((await res?.json().catch(() => null))?.error ?? "Não foi possível trocar a senha.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
        <h1 className="text-lg font-semibold text-slate-900">Trocar senha</h1>
        <Field label="Senha atual" labelClassName={label}>
          <input name="currentPassword" type="password" required autoComplete="current-password" className={input} />
        </Field>
        <Field label="Nova senha (mínimo 8 caracteres)" labelClassName={label}>
          <input name="newPassword" type="password" required minLength={8} autoComplete="new-password" className={input} />
        </Field>
        <Field label="Confirmar nova senha" labelClassName={label}>
          <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={input} />
        </Field>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {busy ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </main>
  );
}
