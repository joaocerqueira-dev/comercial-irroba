import Link from "next/link";
import { IrrobaLogo } from "@/components/ui/IrrobaLogo";

export default function StudioNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-irroba-surface p-6">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200/80 bg-white p-8 text-center shadow-sm">
        <div className="mb-6 flex justify-center">
          <IrrobaLogo variant="primary" theme="light" className="h-8 w-auto" />
        </div>
        <h1 className="font-heading text-2xl font-bold text-irroba-ink">
          Preview <span className="text-brand-500">não encontrado</span>
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Ele pode ter sido excluído ou o blueprint está inválido.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-brand-500 px-6 font-heading text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 active:bg-brand-800"
        >
          Voltar aos previews
        </Link>
      </div>
    </main>
  );
}
