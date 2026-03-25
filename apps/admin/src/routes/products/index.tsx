import { createFileRoute } from "@tanstack/react-router";

import { ProductListPage } from "@/features/products/index.ts";

export const Route = createFileRoute("/products/")({
	component: ProductListPage,
});
