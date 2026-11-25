import type { StoreBlueprint } from "@/lib/types/blueprint";
import type { StorefrontContext } from "../context";
import { cssBase } from "./base";
import { cssHeader } from "./header";
import { cssHeaderMenus } from "./header-menus";
import { cssPages } from "./pages";
import { cssBanners } from "./banners";
import { cssProducts } from "./products";
import { cssFooter } from "./footer";
import { cssOverlays } from "./overlays";

/** CSS completo da vitrine (conteúdo da tag <style>), na ordem original dos módulos. */
export function buildStorefrontCss(bp: StoreBlueprint, ctx: StorefrontContext): string {
  return [
    cssBase(ctx),
    cssHeader(ctx),
    cssHeaderMenus(bp, ctx),
    cssPages(bp),
    cssBanners(bp, ctx),
    cssProducts(),
    cssFooter(),
    cssOverlays(),
  ].join("\n");
}
