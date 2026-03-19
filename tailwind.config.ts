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
        brand: {
          bg: "#0F172A",
          card: "#1E293B",
          accent: "#2E75B6",
          "accent-light": "#4A9FE5",
          "accent-dark": "#1D5A94",
        },
      },
    },
  },
  plugins: [],
};
export default config;
