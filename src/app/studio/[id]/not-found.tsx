import Link from "next/link";

export default function StudioNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-slate-900">Preview não encontrado</h1>
        <p className="mt-2 text-sm text-slate-600">Ele pode ter sido excluído ou o blueprint está inválido.</p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-[44px] items-center rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Voltar aos previews
        </Link>
      </div>
    </main>
  );
}
