import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/radiko-api": {
        target: "https://radiko.jp",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/radiko-api/, ""),
      },
      "/si-radiko": {
        target: "https://si-f-radiko.smartstream.ne.jp",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/si-radiko/, ""),
      },
    },
  },
  plugins: [
    tailwindcss(),
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
  ],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
})
