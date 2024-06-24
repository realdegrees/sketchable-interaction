import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  mode: "jit",
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
  safelist: [
    {
      pattern: /(bg|text|border)-(zinc|blue|red|yellow|green)-{400|500|600}/,
      variants: ["!"],
    },
    { pattern: /opacity-[\d]{1,3}/, variants: ["!"] },
    { pattern: /w-[\d]{1,3}/, variants: ["!"] },
    { pattern: /h-[\d]{1,3}/, variants: ["!"] },
    { pattern: /grid-.+/, variants: ["!"] },
    "grid",
    "text-ellipsis"
  ],
};
export default config;
