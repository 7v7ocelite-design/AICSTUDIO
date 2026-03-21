import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-darkest)",
        surface: "var(--bg-panel)",
        card: "var(--bg-card)",
        "card-hover": "var(--bg-card-hover)",
        sidebar: "var(--bg-sidebar)",
        accent: "var(--aic-red)",
        "accent-hover": "var(--aic-red-hover)",
        text: "var(--text-primary)",
        muted: "var(--text-muted)",
        secondary: "var(--text-secondary)",
        "green-accent": "var(--accent-green)",
        "amber-accent": "var(--accent-amber)",
        "blue-accent": "var(--accent-blue)"
      }
    }
  },
  plugins: []
};

export default config;
