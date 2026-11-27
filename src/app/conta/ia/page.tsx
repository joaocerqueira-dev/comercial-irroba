import Link from "next/link";
import { requirePageUser } from "@/lib/auth/guard";
import { AiSettingsPanel } from "@/components/account/AiSettingsPanel";

export const dynamic = "force-dynamic";

export default async function MinhaIaPage() {
  await requirePageUser();
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link href="/" className="text-sm font-bold text-brand-700 hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 mb-1 font-heading text-2xl font-bold">Minha IA</h1>
      <p className="mb-4 text-sm text-slate-600">
        As gerações com IA usam a sua chave e são cobradas na sua conta do provedor.{" "}
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-brand-700 hover:underline"
        >
          Não tem IA paga? Crie uma chave grátis do Gemini
        </a>
      </p>
      <AiSettingsPanel />
    </main>
  );
}
