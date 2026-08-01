/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dex: {
          bg: "#030712",
          surface: "#0B1117",
          border: "#1F2937",
          cyan: "#38BDF8",
          indigo: "#818CF8",
          tx: "#F1F5F9",
          tx2: "#94A3B8",
          tx3: "#475569",
        },
      },
      fontFamily: {
        sans: ["system-ui", "sans-serif"],
        mono: ["monospace"],
      },
    },
  },
  plugins: [],
};