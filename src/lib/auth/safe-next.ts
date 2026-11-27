/** Caminho interno seguro para redirecionar após o login; qualquer coisa que o navegador resolva para outra origem vira "/". */
export function safeNextPath(next: string | null | undefined, origin: string): string {
  if (!next) return "/";
  try {
    const u = new URL(next, origin);
    return u.origin === origin ? u.pathname + u.search + u.hash : "/";
  } catch {
    return "/";
  }
}
