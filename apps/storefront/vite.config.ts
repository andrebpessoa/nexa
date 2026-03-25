import posthog from "@posthog/rollup-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const posthogPlugins =
	process.env.POSTHOG_PERSONAL_API_KEY && process.env.POSTHOG_PROJECT_ID
		? [
				posthog({
					personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY,
					projectId: process.env.POSTHOG_PROJECT_ID,
					host: process.env.POSTHOG_HOST,
					sourcemaps: {
						releaseName: "storefront",
						deleteAfterUpload: true,
					},
				}),
			]
		: [];

export default defineConfig({
	plugins: [
		tsconfigPaths(),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
		...posthogPlugins,
	],
	ssr: {
		noExternal: ["posthog-js", "@posthog/react"],
	},
	server: {
		port: 3001,
	},
});
