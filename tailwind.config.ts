import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0A",
        surface: "#1A1A1A",
        card: "#242424",
        accent: "#E31B23",
        "accent-hover": "#FF2D35",
        text: "#f3f4f6",
        muted: "#9ca3af"
      }
    }
  },
  plugins: []
};

export default config;
