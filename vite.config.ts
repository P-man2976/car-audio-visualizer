import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	plugins: [
		cloudflare({ viteEnvironment: { name: "ssr" } }),
		tanstackStart(),
		react({
			babel: {
				plugins: [["babel-plugin-react-compiler"]],
			},
		}),
		tailwindcss(),
	],
});
