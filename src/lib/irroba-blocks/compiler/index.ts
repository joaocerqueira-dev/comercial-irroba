// API pública do compiler Irroba (mesmo path de import de antes: "@/lib/irroba-blocks/compiler").
export { compileIrrobaExport, compileProductsCsv } from "./export";
export { compileStorefrontDocument, type StorefrontCompileOptions } from "./document";
export { cleanAltText, fontFallback, stripPreviewAttributes } from "./helpers";
