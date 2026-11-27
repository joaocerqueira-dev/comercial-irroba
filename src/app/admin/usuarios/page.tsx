import Link from "next/link";
import { requirePageUser } from "@/lib/auth/guard";
import { UsersPanel } from "@/components/admin/UsersPanel";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const me = await requirePageUser({ admin: true });
  return (
    <main className="mx-auto max-w-5xl p-6">
      <Link href="/" className="text-sm font-bold text-brand-700 hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 mb-4 font-heading text-2xl font-bold">Usuários</h1>
      <UsersPanel meId={me.id} />
    </main>
  );
}
