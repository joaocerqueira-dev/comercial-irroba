// Documento HTML completo da vitrine (preview standalone do tema LIME).
import { escapeHtml } from "../sanitize";
import type { CompiledExport, StoreBlueprint } from "@/lib/types/blueprint";
import { compileIrrobaExport } from "./export";
import { buildStorefrontContext } from "./context";
import { buildStorefrontCss } from "./css";
import { buildStorefrontRuntime } from "./runtime/storefront";
import { buildStudioInspectorSnippet } from "./runtime/inspector";
import { renderHomeSections } from "./sections/home";
import { renderAnnouncementBar } from "./sections/announcement";
import { renderHeader } from "./sections/header";
import { renderCategoryView } from "./sections/category-view";
import { renderProductView } from "./sections/product-view";
import { renderFooter } from "./sections/footer";
import { renderOverlays } from "./sections/overlays";

export interface StorefrontCompileOptions {
  /** Injeta inspetor visual estilo Irroba (hover com nome + clique para editar) apenas no Studio. */
  studioInspector?: boolean;
}

export function compileStorefrontDocument(
  bp: StoreBlueprint,
  precompiledExport?: CompiledExport,
  options?: StorefrontCompileOptions
): string {
  const ctx = buildStorefrontContext(bp);
  const { fontsParam } = ctx;
  const exportPkg = precompiledExport ?? compileIrrobaExport(bp);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(bp.brand.name)} — Preview Irroba LIME</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?${fontsParam}&display=swap" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,300..500,0..1,-50..200" rel="stylesheet" />
  <style>
${buildStorefrontCss(bp, ctx)}
  </style>
</head>
<body class="page-common-home common-home theme-_lime">
  ${renderAnnouncementBar(bp, ctx)}

${renderHeader(bp, ctx)}

  <main>
    <!-- 1. VIEW: PÁGINA INICIAL (Ordem dinâmica controlada pelo Editor de Seções) -->
    <div id="irb-view-home" class="storeView active">
      ${renderHomeSections(bp, ctx, exportPkg)}
    </div>

${renderCategoryView(bp)}

${renderProductView(bp, ctx)}
  </main>

${renderFooter(bp)}

${renderOverlays(bp)}

  <script>
${buildStorefrontRuntime(bp, ctx)}
  </script>${options?.studioInspector ? buildStudioInspectorSnippet() : ""}
</body>
</html>`;
}
