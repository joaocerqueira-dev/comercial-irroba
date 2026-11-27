"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { useCopyToClipboard } from "@/components/ui/useCopyToClipboard";

type Role = "comercial" | "admin";
interface Row {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  lastLoginAt: string | null;
  previewCount: number;
}

const input = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900";
const btn = "rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold hover:bg-slate-50";

export function UsersPanel({ meId }: { meId: string }) {
  const [users, setUsers] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);
  const [temp, setTemp] = useState<{ who: string; password: string } | null>(null);
  const { copiedKey, copy } = useCopyToClipboard();

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/users").catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok) setUsers(data.users);
    else setError(data?.error ?? "Não foi possível carregar os usuários.");
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function call(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    return { ok: !!res?.ok, data };
  }

  async function patch(u: Row, change: { active?: boolean; role?: Role }) {
    setError("");
    const r = await call(`/api/admin/users/${u.id}`, "PATCH", change);
    if (!r.ok) setError(r.data?.error ?? "Não foi possível salvar.");
    await load();
  }

  async function reset(u: Row) {
    setError("");
    const r = await call(`/api/admin/users/${u.id}/reset-password`, "POST");
    if (r.ok) setTemp({ who: u.email, password: r.data.tempPassword });
    else setError(r.data?.error ?? "Não foi possível redefinir a senha.");
  }

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setFormError("");
    const r = await call("/api/admin/users", "POST", {
      name: f.get("name"),
      email: f.get("email"),
      role: f.get("role"),
    });
    if (!r.ok) return setFormError(r.data?.error ?? "Não foi possível criar.");
    setCreating(false);
    setTemp({ who: r.data.user.email, password: r.data.tempPassword });
    await load();
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : <span />}
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white"
          onClick={() => {
            setFormError("");
            setCreating(true);
          }}
        >
          Novo usuário
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {["Nome", "E-mail", "Papel", "Status", "Último acesso", "Propostas", "Ações"].map((h) => (
                <th key={h} className="px-3 py-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">
                  <select
                    aria-label={`Papel de ${u.name}`}
                    value={u.role}
                    onChange={(e) => void patch(u, { role: e.target.value as Role })}
                    className="rounded border border-slate-300 px-1 py-0.5 text-xs"
                  >
                    <option value="comercial">comercial</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="px-3 py-2">{u.active ? "Ativo" : "Inativo"}</td>
                <td className="px-3 py-2">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("pt-BR") : "Nunca"}</td>
                <td className="px-3 py-2">{u.previewCount}</td>
                <td className="flex gap-2 px-3 py-2">
                  <button type="button" className={btn} onClick={() => void reset(u)}>
                    Redefinir senha
                  </button>
                  {u.id !== meId && (
                    <button type="button" className={btn} onClick={() => void patch(u, { active: !u.active })}>
                      {u.active ? "Inativar" : "Reativar"}
                    </button>
                  )}
                  {u.id === meId && <span className="self-center text-xs text-slate-400">você</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Novo usuário">
        <form onSubmit={onCreate} className="space-y-3">
          <h2 className="font-heading text-lg font-bold">Novo usuário</h2>
          <Field label="Nome" labelClassName="block text-sm font-medium text-slate-700">
            <input name="name" required maxLength={80} className={input} />
          </Field>
          <Field label="E-mail" labelClassName="block text-sm font-medium text-slate-700">
            <input name="email" type="email" required className={input} />
          </Field>
          <Field label="Papel" labelClassName="block text-sm font-medium text-slate-700">
            <select name="role" defaultValue="comercial" className={input}>
              <option value="comercial">comercial</option>
              <option value="admin">admin</option>
            </select>
          </Field>
          {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className={btn} onClick={() => setCreating(false)}>Cancelar</button>
            <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white">Criar</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!temp} onClose={() => setTemp(null)} title="Senha temporária">
        <h2 className="font-heading text-lg font-bold">Senha temporária</h2>
        <p className="mt-1 text-sm text-slate-600">{temp?.who}</p>
        <code className="mt-3 block rounded-lg bg-slate-100 px-3 py-2 text-center text-lg tracking-wider">{temp?.password}</code>
        <p className="mt-2 text-sm text-slate-600">Essa senha não será mostrada de novo.</p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className={btn} onClick={() => temp && void copy("temp", temp.password)}>
            {copiedKey === "temp" ? "Copiado" : "Copiar"}
          </button>
          <button type="button" className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white" onClick={() => setTemp(null)}>
            Fechar
          </button>
        </div>
      </Modal>
    </div>
  );
}
