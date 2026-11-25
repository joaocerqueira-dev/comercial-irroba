import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta oficial Irroba BrandBook 2026 (#EA191F principal + tonalidades de apoio)
        brand: {
          50: "#FEF2F2",
          100: "#FDE8E9",
          200: "#F6A0A2", // Tonalidade de apoio clara oficial (RGB 246, 160, 162)
          300: "#F26B6F",
          400: "#EE3E43",
          500: "#EA191F", // Vermelho Institucional Principal (RGB 234, 25, 31)
          600: "#CC0E11", // Tonalidade de apoio média / hover (RGB 204, 14, 17)
          700: "#AE0203", // Tonalidade de apoio profunda (RGB 174, 2, 3)
          800: "#980101", // Tonalidade de apoio intensa / active (RGB 152, 1, 1)
          900: "#830000", // Tonalidade de apoio escura (RGB 131, 0, 0)
          950: "#520000",
        },
        irroba: {
          primary: "#EA191F",
          soft: "#F6A0A2",
          mid: "#CC0E11",
          deep: "#AE0203",
          crimson: "#980101",
          maroon: "#830000",
          surface: "#F7F7F8",
          ink: "#1F1F23",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "Neue Haas Grotesk Display Pro",
          "Helvetica Neue",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        heading: [
          "Montserrat",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        logo: ["Nunito", "Montserrat", "sans-serif"],
        serif: ["Instrument Serif", "Baskerville", "Georgia", "serif"],
      },
      borderRadius: {
        brand: "1rem",
      },
    },
  },
  plugins: [],
};

export default config;
