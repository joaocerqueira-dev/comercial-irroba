import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-bold text-emerald-700">Erro 404</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Página não encontrada</h1>
        <p className="mt-2 text-sm text-slate-600">O endereço acessado não existe ou foi removido.</p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-[44px] items-center rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
