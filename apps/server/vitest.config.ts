import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["src/**/*.test.ts"],
		exclude: ["src/**/*.integration.test.ts"],
		passWithNoTests: true,
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
});
