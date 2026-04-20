/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "Menlo", "monospace"],
      },
      colors: {
        ink: {
          0: "#000000",
          50: "#070707",
          100: "#0c0c0c",
          200: "#111111",
          300: "#161616",
          400: "#1c1c1c",
          500: "#262626",
          600: "#3a3a3a",
          700: "#555555",
          800: "#7a7a7a",
          900: "#cfcfcf",
          950: "#f2f2f2",
        },
        brand: {
          DEFAULT: "#ff3b4a",
          soft: "rgba(255,59,74,0.12)",
        },
        sig: {
          cyan: "#4db8ff",
          violet: "#c084fc",
          amber: "#f9a825",
          green: "#10b981",
        },
      },
      boxShadow: {
        glow: "0 0 28px rgba(255,59,74,0.35)",
        card: "0 8px 24px rgba(0,0,0,0.55)",
      },
      animation: {
        "pulse-dot": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 200ms ease-out",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: 0, transform: "translateY(4px)" }, "100%": { opacity: 1, transform: "none" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
    },
  },
  plugins: [],
};
