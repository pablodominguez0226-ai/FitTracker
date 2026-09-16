/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          brick: "#FF5722",
          rust: "#C84218",
          glow: "#FF5722",
          dark: "#000000",
          card: "#1C1C1E",
          surface: "#121212",
          border: "#2C2C2E",
          borderLight: "rgba(255, 255, 255, 0.05)",
          ember: "#D84315",
          charcoal: "#1C1C1E",
          neonPurple: "#7C4DFF",
          neonViolet: "#7C4DFF",
          purple: "#7C4DFF",
        },
        oled: {
          bg: "#000000",
          card: "#1C1C1E",
          cardHover: "#2C2C2E",
          surface: "#121212",
          border: "#2C2C2E",
          borderLight: "rgba(255, 255, 255, 0.05)",
          neon: "#FF5722",
          electric: "#7C4DFF",
          darkElectric: "#7C4DFF",
          pr: "#FF5722",
          success: "#34D399",
          text: "#FFFFFF",
          muted: "#8E8E93",
          subtle: "#8E8E93",
        },
      },
      boxShadow: {
        none: "none",
      },
    },
  },
  plugins: [],
};


