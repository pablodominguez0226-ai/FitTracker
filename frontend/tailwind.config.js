/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          brick: "#FF5722",
          rust: "#C84218",
          glow: "#FF6D00",
          dark: "#050505",
          card: "#121113",
          border: "#2A1B14",
          borderLight: "#3D251C",
          ember: "#D84315",
          charcoal: "#0D0C0E",
        },
        oled: {
          bg: "#050505",
          card: "#121113",
          cardHover: "#1A1618",
          border: "#2A1B14",
          borderLight: "#3D251C",
          neon: "#FF5722",
          electric: "#FF6D00",
          darkElectric: "#C84218",
          pr: "#FF7D3B",
          success: "#34D399",
          text: "#FFFFFF",
          muted: "#A1A1AA",
          subtle: "#71717A",
        },
      },
      boxShadow: {
        neon: "0 0 20px rgba(255, 87, 34, 0.4)",
        neonLg: "0 0 35px rgba(255, 109, 0, 0.6)",
        prGlow: "0 0 16px rgba(255, 109, 0, 0.45)",
        successGlow: "0 0 18px rgba(52, 211, 153, 0.45)",
        card: "0 8px 24px -4px rgba(0, 0, 0, 0.7)",
        cardActive: "0 0 20px rgba(255, 87, 34, 0.35), 0 8px 24px rgba(0,0,0,0.8)",
      },
    },
  },
  plugins: [],
};


