import { IrrobaLogo } from "@/components/ui/IrrobaLogo";

export default function PreviewNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-irroba-surface p-6">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200/80 bg-white p-8 text-center shadow-sm">
        <div className="mb-6 flex justify-center">
          <IrrobaLogo variant="primary" theme="light" className="h-8 w-auto" />
        </div>
        <h1 className="font-heading text-2xl font-bold text-irroba-ink">
          Esta prévia <span className="text-brand-500">expirou</span>
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          O link não está mais disponível. Fale com seu consultor da Irroba para receber uma prévia atualizada.
        </p>
      </div>
    </main>
  );
}
