import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import { describe, expect, it } from "vitest";
import tailwindConfig from "../../../tailwind.config";
import { BRAND_SCALE, CSS_VARS, hexToRgbChannels, IRROBA_COLORS } from "@/lib/design-tokens";

const SRC = path.resolve(__dirname, "../..");

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "__tests__" ? [] : walk(full);
    return /\.(tsx?|css)$/.test(e.name) ? [full] : [];
  });
}

/** Todas as classes com modificador de opacidade sobre cores da marca usadas no app. */
function opacityClassesInUse(): string[] {
  const re = /(?:[a-z-]+:)*[a-z]+-(?:brand|irroba)-[a-z0-9]+\/[0-9]+/g;
  const found = new Set<string>();
  for (const file of [...walk(path.join(SRC, "app")), ...walk(path.join(SRC, "components"))]) {
    for (const m of fs.readFileSync(file, "utf8").match(re) ?? []) found.add(m);
  }
  return [...found].sort();
}

async function buildCss(classes: string[]): Promise<string> {
  const result = await postcss([
    tailwindcss({
      ...tailwindConfig,
      content: [{ raw: `<div class="${classes.join(" ")}"></div>`, extension: "html" }],
      corePlugins: { preflight: false },
    }),
  ]).process("@tailwind base; @tailwind utilities;", { from: undefined });
  return result.css;
}

function escapeClass(cls: string): string {
  return cls.replace(/[:/.]/g, (c) => `\\${c}`);
}

function ruleBody(css: string, cls: string): string {
  const idx = css.indexOf(`.${escapeClass(cls)}`);
  expect(idx, `classe ${cls} não gerada`).toBeGreaterThanOrEqual(0);
  return css.slice(idx, css.indexOf("}", idx));
}

describe("design tokens + Tailwind (canais RGB e <alpha-value>)", () => {
  it("converte hex em canais RGB", () => {
    expect(hexToRgbChannels("#EA191F")).toBe("234 25 31");
    expect(() => hexToRgbChannels("red")).toThrow();
  });

  it("injeta todas as vars em :root como canais RGB", async () => {
    const css = await buildCss(["bg-brand-500"]);
    expect(CSS_VARS["--irroba-red"]).toBe("234 25 31");
    for (const tone of Object.keys(BRAND_SCALE)) {
      expect(css).toContain(`--brand-${tone}: ${CSS_VARS[`--brand-${tone}`]}`);
    }
    for (const { cssVar } of Object.values(IRROBA_COLORS)) {
      expect(css).toContain(`${cssVar}: ${CSS_VARS[cssVar]}`);
    }
  });

  it("encontra os modificadores de opacidade usados no app", () => {
    const classes = opacityClassesInUse();
    expect(classes).toEqual(expect.arrayContaining(["bg-brand-50/50", "ring-brand-200/70"]));
    expect(classes.length).toBeGreaterThanOrEqual(10);
  });

  it("todo modificador de opacidade em uso gera alpha sobre a var", async () => {
    const classes = opacityClassesInUse();
    const css = await buildCss(classes);
    for (const cls of classes) {
      const alpha = Number(cls.split("/").pop()) / 100;
      const body = ruleBody(css, cls);
      expect(body, cls).toMatch(new RegExp(`rgb\\(var\\(--[a-z0-9-]+\\) / ${alpha}\\)`));
    }
  });

  it("cor sem modificador continua opaca (var de opacidade do Tailwind)", async () => {
    const css = await buildCss(["bg-irroba-ink", "text-brand-600"]);
    expect(ruleBody(css, "bg-irroba-ink")).toContain("rgb(var(--irroba-ink) / var(--tw-bg-opacity");
    expect(ruleBody(css, "text-brand-600")).toContain("rgb(var(--brand-600) / var(--tw-text-opacity");
  });
});
