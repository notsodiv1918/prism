/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#FBFBFA",
        surface: "#FFFFFF",
        ink: "#16161A",
        muted: "#6B6B72",
        faint: "#9A9AA2",
        line: "#E7E6E2",
        "line-strong": "#D8D7D2",
      },
      fontFamily: {
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      keyframes: {
        blink: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0" } },
        sweep: { "0%": { left: "-30%" }, "100%": { left: "100%" } },
        rise: {
          "0%": { opacity: "0", transform: "translateY(3px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        blink: "blink 1.1s step-end infinite",
        sweep: "sweep 1.1s ease-in-out infinite",
        rise: "rise 0.25s ease-out both",
      },
    },
  },
  plugins: [],
};
