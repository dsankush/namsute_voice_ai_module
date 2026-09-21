import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["Poppins", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
      },
      colors: {
        bg: "var(--bg)",
        "bg-shell": "var(--bg2)",
        "bg-section": "var(--bg3)",
        surface: "var(--surface)",
        "surface-hover": "var(--surface2)",
        border: "var(--border)",
        "border-focus": "var(--border2)",
        ink: "var(--ink)",
        "ink-muted": "var(--ink2)",
        placeholder: "var(--muted)",
        accent: {
          green: "var(--accent-green)",
          "green-mid": "var(--accent-green-mid)",
          "green-deep": "var(--accent-green-deep)",
          gold: "var(--gold)",
          "gold-base": "var(--gold-base)",
        },
        diamond: "var(--diamond-blue)",
        silver: "var(--silver)",
        bronze: "var(--bronze)",
        "card-bg": "var(--card-bg)",
        "input-bg": "var(--input-bg)",
      },
      animation: {
        "float": "float 5s ease-in-out infinite",
        "float-slow": "float 7s ease-in-out infinite 1s",
        "scan": "scan-line 2.5s ease-in-out infinite alternate",
        "spin-slow": "spin-slow 20s linear infinite",
        "marquee": "marquee 25s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-14px)" },
        },
        "scan-line": {
          "0%": { top: "8%" },
          "100%": { top: "88%" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
