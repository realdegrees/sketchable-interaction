import { COLORS } from "./src/util/constants";
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/react-photo-editor/dist/*.js", // Only relevant for https://www.npmjs.com/package/react-photo-editor
  ],
  mode: "jit",
  theme: {
    extend: {
      colors: {
        "tldraw-tool-selected": "var(--tldraw-tool-selected)",
        "tldraw-tool-bg": "var(--tldraw-tool-bg)",
      },
    },
  },
  plugins: [require("tailwind-scrollbar")],
  safelist: [
    ...COLORS.map((c) => ({
      pattern: new RegExp(`bg-${c}-500`),
    })),
  ],
};
export default config;
