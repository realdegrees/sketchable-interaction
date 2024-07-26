import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  mode: "jit",
  theme: {
    extend: {},
  },
  plugins: [],
  safelist: [  ],
};
export default config;
