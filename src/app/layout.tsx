import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Nutra — plataforma para nutricionistas e pacientes",
    template: "%s · Nutra",
  },
  description:
    "Anamnese completa, base de alimentos TACO, planos alimentares, diário com fotos, chat e cálculos nutricionais em um só lugar.",
  applicationName: "Nutra",
  // Na tela de início do iPhone: abre sem a barra do Safari e com o nome curto.
  appleWebApp: { capable: true, title: "Nutra", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#059669",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-sw: o service worker (public/sw.js) só é registrado no build de produção.
    <html
      lang="pt-BR"
      data-sw={process.env.NODE_ENV === "production" ? "on" : undefined}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <Script src="/pwa.js" strategy="beforeInteractive" />
      </body>
    </html>
  );
}
