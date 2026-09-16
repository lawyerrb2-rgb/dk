/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'IBM Plex Sans Thai'", "'Noto Sans Thai'", "system-ui", "sans-serif"],
      },
      colors: {
        ink: {
          950: "#0B1620",
          900: "#0F2231",
          800: "#15324A",
          700: "#1D4863",
        },
        frost: {
          50: "#EFFBFD",
          100: "#D8F3F7",
          200: "#AFE6EE",
          300: "#7CD3E0",
          400: "#3FB6CB",
          500: "#1C9AB3",
          600: "#127D93",
        },
        clay: {
          500: "#E8853A",
          600: "#D06F27",
        },
      },
      boxShadow: {
        panel: "0 1px 0 rgba(15,34,49,0.06), 0 8px 24px -12px rgba(15,34,49,0.18)",
      },
    },
  },
  plugins: [],
};
