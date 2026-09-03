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
        forest: '#1F4D2C',
        leaf: '#4C7A3F',
        leafLight: '#6E9A5C',
        gold: '#D4A017',
        goldSoft: '#E8C463',
        cream: '#F6F1E4',
        cream2: '#EFE8D6',
        earth: '#6B4A2F',
        ink: '#232E1F',
        inkSoft: '#4A5442',
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
