import { createFileRoute } from "@tanstack/react-router";

import { AuthPage } from "@/features/auth/index.ts";

export const Route = createFileRoute("/login")({
	component: AuthPage,
});
