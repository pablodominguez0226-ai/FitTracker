/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        oled: {
          bg: "#09060E",
          card: "#140E24",
          cardHover: "#1C1433",
          border: "#2D1B4E",
          borderLight: "#422872",
          neon: "#A855F7",
          electric: "#9333EA",
          darkElectric: "#7E22CE",
          pr: "#C084FC",
          success: "#34D399",
          text: "#FFFFFF",
          muted: "#A1A1AA",
          subtle: "#71717A",
        },
      },
      boxShadow: {
        neon: "0 0 20px rgba(168, 85, 247, 0.4)",
        neonLg: "0 0 35px rgba(168, 85, 247, 0.6)",
        prGlow: "0 0 16px rgba(192, 132, 252, 0.4)",
        successGlow: "0 0 18px rgba(52, 211, 153, 0.45)",
        card: "0 8px 24px -4px rgba(0, 0, 0, 0.6)",
        cardActive: "0 0 20px rgba(168, 85, 247, 0.3), 0 8px 24px rgba(0,0,0,0.7)",
      },
    },
  },
  plugins: [],
};


