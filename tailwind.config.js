/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        studio: {
          charcoal: "#121417",
          dark: "#1c1f24",
          surface: "#f8fafc",
          border: "#e2e8f0",
          accent: "#f59e0b",
          primary: "#0f172a",
        },
      },
    },
  },
  plugins: [],
};

