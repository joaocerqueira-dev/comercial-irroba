import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera .next/standalone (server.js + node_modules mínimos) para a imagem Docker.
  output: "standalone",
  // Fixa a raiz do tracing no projeto: sem isso, um lockfile em diretório pai (ex.: worktrees)
  // faz o server.js sair aninhado em .next/standalone/<subpasta>/.
  outputFileTracingRoot: process.cwd(),
  serverExternalPackages: ["playwright", "@prisma/client"],
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Só o próprio app embute suas páginas. Vale também para /render/*, que o app embute
          // em iframe (mesma origem); lá a CSP ainda tem frame-ancestors 'self'.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // HSTS fica no reverse proxy TLS (docs/deploy.md), não no app.
        ],
      },
    ];
  },
};

export default nextConfig;
