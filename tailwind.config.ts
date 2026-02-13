import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 10px 25px rgba(0,0,0,0.08)"
      }
    }
  },
  plugins: []
} satisfies Config;
