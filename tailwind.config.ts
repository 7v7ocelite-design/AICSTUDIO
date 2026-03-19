import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#0F172A",
        card: "#1E293B",
        accent: "#2E75B6",
        muted: "#334155",
        border: "#475569"
      },
      boxShadow: {
        panel: "0 16px 40px rgba(15, 23, 42, 0.35)"
      },
      backgroundImage: {
        "premium-glow":
          "radial-gradient(circle at 10% 10%, rgba(46, 117, 182, 0.2), transparent 40%), radial-gradient(circle at 90% 20%, rgba(14, 165, 233, 0.18), transparent 38%)"
      }
    }
  },
  plugins: []
};

export default config;
