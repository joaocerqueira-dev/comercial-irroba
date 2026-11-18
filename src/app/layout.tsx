import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Irroba Preview AI — Gerador Comercial de Layouts Beta",
  description:
    "Analise lojas concorrentes e gere previews interativos no Tema LIME da Irroba com exportação low-code para implantação.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
