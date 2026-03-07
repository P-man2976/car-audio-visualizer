import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		projects: [
			{
				resolve: {
					alias: {
						"@": path.resolve(__dirname, "./src"),
					},
				},
				test: {
					name: "unit",
					environment: "node",
					include: ["src/**/*.test.ts"],
				},
			},
			{
				plugins: [
					react({
						babel: {
							plugins: [["babel-plugin-react-compiler"]],
							presets: ["jotai-babel/preset"],
						},
					}),
					tailwindcss(),
				],
				resolve: {
					alias: {
						"@": path.resolve(__dirname, "./src"),
					},
				},
				test: {
					name: "browser",
					include: ["src/**/*.browser.test.tsx"],
					setupFiles: ["src/test/browser-setup.ts"],
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: "chromium" }],
					},
				},
			},
		],
	},
});
