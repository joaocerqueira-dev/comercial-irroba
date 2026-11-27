import { IrrobaLogo } from "@/components/ui/IrrobaLogo";

/** Aviso centralizado do link do cliente (indisponível ou expirado). */
export default function ShareNotice({ title, whatsapp }: { title: string; whatsapp?: string | null }) {
  const digits = whatsapp?.replace(/\D/g, "");
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 text-center shadow">
        <IrrobaLogo />
        <h1 className="text-base font-semibold text-slate-900">{title}</h1>
        {digits && (
          <a
            href={`https://wa.me/${digits}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Falar no WhatsApp
          </a>
        )}
      </div>
    </main>
  );
}
