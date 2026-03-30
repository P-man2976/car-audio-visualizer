import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite-plus";

// https://vite.dev/config/
export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: false,
    },
    overrides: [
      {
        files: ["**/*.test.ts", "**/*.test.tsx"],
        rules: {
          "typescript/no-floating-promises": "off",
          "typescript/no-misused-spread": "off",
        },
      },
    ],
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
        presets: ["jotai-babel/preset"],
      },
    }),
    tailwindcss(),
  ],
});
