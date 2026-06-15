export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        fitBg: "#070A12",
        fitSurface: "#0D111C",
        fitCard: "#11131C",
        fitElevated: "#171B29",
        fitPrimary: "#2F80FF",
        fitPrimarySoft: "#60A5FA",
        fitText: "#F8FAFC"
      },
      boxShadow: {
        glow: "0 0 22px rgba(47,128,255,0.16)",
        soft: "0 16px 42px rgba(0,0,0,0.30)",
        card: "0 14px 34px rgba(0,0,0,0.24)"
      }
    }
  },
  plugins: []
};
