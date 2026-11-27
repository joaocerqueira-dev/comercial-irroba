"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { IrrobaLogo } from "@/components/ui/IrrobaLogo";
import { Field } from "@/components/ui/Field";

const input = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900";

function LoginForm() {
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: f.get("email"), password: f.get("password") }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) {
      setBusy(false);
      setError(data?.error ?? "Não foi possível entrar.");
      return;
    }
    const next = params.get("next");
    // só caminhos internos (evita open redirect)
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    window.location.assign(data.user.mustChangePassword ? "/conta/senha" : safeNext);
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
      <IrrobaLogo />
      <Field label="E-mail" labelClassName="block text-sm font-medium text-slate-700">
        <input name="email" type="email" required autoComplete="username" className={input} />
      </Field>
      <Field label="Senha" labelClassName="block text-sm font-medium text-slate-700">
        <input name="password" type="password" required autoComplete="current-password" className={input} />
      </Field>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
        {busy ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
