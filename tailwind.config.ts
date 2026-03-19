import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "#06090f",
        surface: "#111827",
        card: "#1f2937",
        accent: "#38bdf8",
        text: "#f3f4f6",
        muted: "#9ca3af"
      }
    }
  },
  plugins: []
};

export default config;
