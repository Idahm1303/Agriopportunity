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
        "agri-forest": "#19542e",
        "agri-green": "#57874c",
        "agri-gold": "#e9a82b",
        "agri-gold-soft": "#e9c76d",
        "agri-mint": "#e6f5f2",
        forest: "#19542e",
        leaf: "#57874c",
        leafLight: "#77a66b",
        gold: "#e9a82b",
        goldSoft: "#e9c76d",
        cream: "#e6f5f2",
        cream2: "#d5ebe6",
        earth: '#6B4A2F',
        ink: "#173b2a",
        inkSoft: "#446c55",
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'serif'],
        sans: ['var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
