import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["src/**/*.integration.test.ts"],
		testTimeout: 30000,
		hookTimeout: 60000,
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
});
