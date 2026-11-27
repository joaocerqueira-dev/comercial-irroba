// API pública do compiler Irroba (mesmo path de import de antes: "@/lib/irroba-blocks/compiler").
export { compileIrrobaExport, compileProductsCsv } from "./export";
export { getDefaultEditorialGalleryHtml, getDefaultEditorialLookbookHtml } from "./html-blocks";
export { compileStorefrontDocument, withoutStudioInspector, type StorefrontCompileOptions } from "./document";
export { cleanAltText, fontFallback, stripPreviewAttributes } from "./helpers";
