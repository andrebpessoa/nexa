import { createFileRoute } from "@tanstack/react-router";

import { LoginPage } from "@/features/auth/index.ts";

export const Route = createFileRoute("/login")({
	component: LoginPage,
});
