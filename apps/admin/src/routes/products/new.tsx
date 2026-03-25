import { createFileRoute } from "@tanstack/react-router";

import { ProductNewPage } from "@/features/products/index.ts";

export const Route = createFileRoute("/products/new")({
	component: ProductNewPage,
});
