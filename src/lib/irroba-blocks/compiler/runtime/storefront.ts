import type { StoreBlueprint } from "@/lib/types/blueprint";
import type { StorefrontContext } from "../context";
import { storefrontRuntimeCore } from "./storefront-core";
import { storefrontRuntimeUi } from "./storefront-ui";

/**
 * JS da vitrine (conteúdo da tag <script>). O IIFE começa em storefrontRuntimeCore e
 * fecha em storefrontRuntimeUi: as duas partes só fazem sentido concatenadas.
 */
export function buildStorefrontRuntime(bp: StoreBlueprint, ctx: StorefrontContext): string {
  return [storefrontRuntimeCore(bp, ctx), storefrontRuntimeUi()].join("\n");
}
