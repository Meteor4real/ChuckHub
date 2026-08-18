import type { Config } from "tailwindcss";

// MoreMe download-page theme tokens — the real Papatui palette (matches
// apps/desktop/src/moreme/styles.ts PAPATUI_PALETTE exactly, not a mint-CRT
// approximation of it). Class names stay `chuck-*` for historical reasons —
// they're just CSS aliases now; only the *values* are MoreMe.
const config: Config = {
  content: ["./app/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      colors: {
        chuck: {
          bg: "#1B1712",
          panel: "#26201A",
          line: "#3D3323",
          ink: "#F3EBDB",
          mute: "#C9B99E",
          red: "#5C7A4A",         // primary accent (olive-green)
          pink: "#8AAE6E",        // soft accent
          orange: "#B8862F",      // attention / bronze
          glow: "#5C7A4A",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "monospace"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px 0 rgba(92, 122, 74, 0.45), 0 0 4px 0 rgba(138, 174, 110, 0.4)",
        glowSoft: "0 0 18px 0 rgba(92, 122, 74, 0.30)",
      },
      animation: {
        pulseGlow: "pulseGlow 2.6s ease-in-out infinite",
        scan: "scan 6s linear infinite",
        flicker: "flicker 4s steps(20, end) infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "1", filter: "drop-shadow(0 0 6px #5C7A4A)" },
          "50%": { opacity: "0.6", filter: "drop-shadow(0 0 14px #8AAE6E)" },
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
