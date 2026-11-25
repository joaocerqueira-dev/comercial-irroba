import type { Metadata } from "next";
import { Instrument_Serif, Inter, Montserrat, Nunito } from "next/font/google";
import "./globals.css";

// next/font baixa as fontes no `next build` e as serve do próprio app (sem <link> para o Google
// em runtime). Por isso o build (CI e docker build) precisa de rede: ver docs/deploy.md.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
  variable: "--font-montserrat",
});
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
  variable: "--font-nunito",
});
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-instrument-serif",
});

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
    <html
      lang="pt-BR"
      className={`${inter.variable} ${montserrat.variable} ${nunito.variable} ${instrumentSerif.variable}`}
    >
      <body className="min-h-screen bg-irroba-surface font-sans text-irroba-ink antialiased selection:bg-brand-500/15 selection:text-brand-800">
        {children}
      </body>
    </html>
  );
}
