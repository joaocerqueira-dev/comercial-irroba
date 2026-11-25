import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import { CSS_VARS, TAILWIND_COLORS } from "./src/lib/design-tokens";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Fonte única: src/lib/design-tokens.ts (CSS vars em canais RGB + <alpha-value>).
      colors: TAILWIND_COLORS,
      // As vars --font-* vêm do next/font em src/app/layout.tsx.
      fontFamily: {
        sans: ["var(--font-inter)", "Helvetica Neue", "ui-sans-serif", "system-ui", "sans-serif"],
        heading: ["var(--font-montserrat)", "var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        logo: ["var(--font-nunito)", "var(--font-montserrat)", "sans-serif"],
        serif: ["var(--font-instrument-serif)", "Baskerville", "Georgia", "serif"],
      },
      borderRadius: {
        brand: "1rem",
      },
    },
  },
  plugins: [
    // Injeta as CSS vars dos tokens em :root, para o CSS puro (globals.css) usar rgb(var(--x)).
    plugin(({ addBase }) => {
      addBase({ ":root": CSS_VARS });
    }),
  ],
};

export default config;
