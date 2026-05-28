import type { Config } from "tailwindcss";

export const genseerTheme = {
  colors: {
    background: "#070A13",
    surface: "#0F172A",
    surfaceSoft: "#162033",
    surfaceRaised: "#1D2A44",
    primary: "#6C5CE7",
    primaryGlow: "#A78BFA",
    electricBlue: "#38BDF8",
    signalGreen: "#22C55E",
    warningAmber: "#F59E0B",
    dangerRed: "#EF4444",
    textMain: "#F8FAFC",
    textMuted: "#94A3B8",
    textFaint: "#64748B",
  },
};

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#070A13",
        surface: "#0F172A",
        "surface-soft": "#162033",
        "surface-raised": "#1D2A44",
        primary: "#6C5CE7",
        "primary-glow": "#A78BFA",
        "electric-blue": "#38BDF8",
        "signal-green": "#22C55E",
        "warning-amber": "#F59E0B",
        "danger-red": "#EF4444",
        "text-main": "#F8FAFC",
        "text-muted": "#94A3B8",
        "text-faint": "#64748B",
      },
      borderColor: {
        DEFAULT: "rgba(148, 163, 184, 0.18)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
