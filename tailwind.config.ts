import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  mode: "jit",
  theme: {
    extend: {
      colors: {
        "tldraw-tool-selected": "var(--tldraw-tool-selected)",
        "tldraw-tool-bg": "var(--tldraw-tool-bg)",
      },
    },
  },
  plugins: [],
  safelist: [],
};
export default config;
