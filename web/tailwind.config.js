/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        /* Warm ochre palette — burnt orange academic accent */
        ochre: {
          50:  "#fdf6f0",
          100: "#fae8d8",
          200: "#f5cfb0",
          300: "#ecab78",
          400: "#e07245",
          500: "#c4622d",
          600: "#a84f23",
          700: "#8a3d1d",
          800: "#6e301a",
          900: "#4f2213",
        },
        /* Warm stone palette — background neutrals */
        stone: {
          50:  "#fafaf9",
          100: "#f5f0eb",
          200: "#eee8e0",
          300: "#e0d8ce",
          400: "#c9bfb4",
          500: "#a8a29e",
          600: "#7a7068",
          700: "#57534e",
          800: "#3d3733",
          900: "#252220",
          950: "#1c1917",
        },
      },
      fontFamily: {
        sans:    ["Nunito", "Noto Sans SC", "system-ui", "sans-serif"],
        display: ["Nunito", "Noto Sans SC", "system-ui", "sans-serif"],
        mono:    ["JetBrains Mono", "Fira Code", "Consolas", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        "warm":         "0 0 0 1px rgba(196,98,45,0.18), 0 0 20px rgba(196,98,45,0.18), 0 4px 24px -4px rgba(196,98,45,0.22)",
        "warm-sm":      "0 0 0 1px rgba(196,98,45,0.14), 0 0 10px rgba(196,98,45,0.14)",
        "warm-lg":      "0 0 0 1px rgba(196,98,45,0.22), 0 0 40px rgba(196,98,45,0.22), 0 8px 48px -6px rgba(196,98,45,0.28)",
        "bot-bubble":   "0 2px 12px -2px rgba(0,0,0,0.1), 0 1px 4px -1px rgba(0,0,0,0.06)",
        "user-bubble":  "0 4px 20px -4px rgba(196,98,45,0.4), 0 2px 8px -2px rgba(196,98,45,0.25)",
        "input":        "0 2px 20px -4px rgba(0,0,0,0.1)",
        "input-warm":   "0 0 0 2px rgba(196,98,45,0.25), 0 4px 24px -4px rgba(196,98,45,0.12)",
      },
      keyframes: {
        /* accordion */
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up":   { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        /* warm shimmer along a line */
        "aurora-flow": {
          "0%":   { backgroundPosition: "0% 50%",   opacity: "0.7" },
          "50%":  { backgroundPosition: "100% 50%", opacity: "1"   },
          "100%": { backgroundPosition: "0% 50%",   opacity: "0.7" },
        },
        /* floating bob */
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-8px)" },
        },
        /* glow pulse */
        "glow-pulse": {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)"    },
          "50%":      { opacity: "1",   transform: "scale(1.04)" },
        },
        /* typing cursor */
        cursor: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0" },
        },
        /* loading dots */
        "bounce-dot": {
          "0%, 80%, 100%": { transform: "translateY(0) scale(0.65)", opacity: "0.35" },
          "40%":           { transform: "translateY(-6px) scale(1)", opacity: "1"    },
        },
        /* spring pop */
        "pop-in": {
          "0%":   { opacity: "0", transform: "scale(0.88) translateY(8px)" },
          "65%":  { transform: "scale(1.025) translateY(-2px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)"      },
        },
        /* slide from left */
        "slide-right": {
          from: { opacity: "0", transform: "translateX(-12px)" },
          to:   { opacity: "1", transform: "translateX(0)"     },
        },
        /* slow orbit for bg orbs */
        orbit: {
          "0%":   { transform: "translate(0px, 0px) scale(1)"       },
          "33%":  { transform: "translate(40px, -30px) scale(1.05)" },
          "66%":  { transform: "translate(-20px, 20px) scale(0.97)" },
          "100%": { transform: "translate(0px, 0px) scale(1)"       },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "aurora-flow":    "aurora-flow 5s ease infinite",
        float:            "float 5s ease-in-out infinite",
        "glow-pulse":     "glow-pulse 2.5s ease-in-out infinite",
        cursor:           "cursor 1.1s ease-in-out infinite",
        "bounce-dot":     "bounce-dot 1.3s ease-in-out infinite",
        "pop-in":         "pop-in 0.42s cubic-bezier(0.22,1,0.36,1)",
        "slide-right":    "slide-right 0.3s cubic-bezier(0.22,1,0.36,1)",
        orbit:            "orbit 18s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
