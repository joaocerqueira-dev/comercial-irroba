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
};

export default nextConfig;
