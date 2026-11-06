import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        summa: {
          primary: "#D93A2F",
          primaryDark: "#8C1F2B",
          accent: "#F4A23B",
          tint: "#FDE9E4",
          bg: "#FFF8F5",
          ink: "#2A1F2D",
          muted: "#6E6270",
          line: "#F0DCD6",
        },
        status: {
          ok: "#1F8F7E",
          hold: "#E9A12B",
          sold: "#BDB3B8",
          bad: "#B3261E",
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', "sans-serif"],
        body: ['"DM Sans"', "sans-serif"],
      },
      boxShadow: {
        summa: "0 6px 24px rgba(140, 31, 43, 0.10)",
      },
      backgroundImage: {
        "summa-gradient": "linear-gradient(135deg, #D93A2F 0%, #EE6A35 60%, #F4A23B 100%)",
      },
      borderRadius: {
        seat: "8px 8px 5px 5px",
        ticket: "20px",
      },
    },
  },
  plugins: [],
};

export default config;
