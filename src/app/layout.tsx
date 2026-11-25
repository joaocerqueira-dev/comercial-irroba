import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Irroba Preview AI · Gerador Comercial",
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&family=Montserrat:wght@500;600;700;800&family=Nunito:wght@700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-irroba-surface font-sans text-irroba-ink antialiased selection:bg-brand-500/15 selection:text-brand-800">
        {children}
      </body>
    </html>
  );
}
