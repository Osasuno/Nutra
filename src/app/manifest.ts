import type { MetadataRoute } from "next";

// Manifesto do app instalável (PWA). O início é /login: quem já está logado é levado pelo
// proxy direto para a sua área (nutricionista ou paciente).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Nutra",
    short_name: "Nutra",
    description: "Plano alimentar, diário, consultas e chat entre nutricionista e paciente.",
    lang: "pt-BR",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#059669",
    categories: ["health", "medical", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
