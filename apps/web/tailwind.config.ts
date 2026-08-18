import type { Config } from "tailwindcss";

// MoreMe download-page theme tokens — the real DP (Dude Perfect) palette,
// pulled verbatim from More_Me's own css/style.css dark-mode block (matches
// apps/desktop/src/moreme/styles.ts DP_PALETTE exactly). Class names stay
// `chuck-*` for historical reasons — they're just CSS aliases now; only the
// *values* are MoreMe.
const config: Config = {
  content: ["./app/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      colors: {
        chuck: {
          bg: "#0F1318",
          panel: "#1A2028",
          line: "#2A3038",
          ink: "#FFFFFF",
          mute: "#A8B3C0",
          red: "#3EDBB5",         // primary accent (DP Mint)
          pink: "#7FEBD0",        // soft accent
          orange: "#33B5FF",      // secondary / cool accent
          glow: "#3EDBB5",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "monospace"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px 0 rgba(62, 219, 181, 0.45), 0 0 4px 0 rgba(127, 235, 208, 0.4)",
        glowSoft: "0 0 18px 0 rgba(62, 219, 181, 0.30)",
      },
      animation: {
        pulseGlow: "pulseGlow 2.6s ease-in-out infinite",
        scan: "scan 6s linear infinite",
        flicker: "flicker 4s steps(20, end) infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "1", filter: "drop-shadow(0 0 6px #3EDBB5)" },
          "50%": { opacity: "0.6", filter: "drop-shadow(0 0 14px #7FEBD0)" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "47%": { opacity: "1" },
          "48%": { opacity: "0.4" },
          "49%": { opacity: "1" },
          "78%": { opacity: "1" },
          "79%": { opacity: "0.6" },
          "80%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
