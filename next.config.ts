import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // O proxy guarda o corpo da requisição em memória até este limite e corta o resto.
    // Exames vão até 10 MB; a folga cobre o envelope do multipart.
    proxyClientMaxBodySize: "12mb",
  },
  // Em desenvolvimento, permite abrir o site pelo IP da rede local (ex.: testar no celular).
  // Para outro endereço, defina DEV_ORIGINS no .env (separado por vírgulas).
  allowedDevOrigins: [
    "127.0.0.1",
    "192.168.*.*",
    "10.*.*.*",
    "172.*.*.*",
    "198.19.*.*",
    ...(process.env.DEV_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? []),
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
