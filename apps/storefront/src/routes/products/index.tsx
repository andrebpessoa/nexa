import { createFileRoute } from "@tanstack/react-router";

import { ProductListPage } from "@/features/products/index.ts";
import { api, edenFetch } from "@/lib/eden.ts";

export const Route = createFileRoute("/products/")({
	component: function ProductsRoute() {
		const products = Route.useLoaderData();
		return <ProductListPage products={products?.items ?? []} />;
	},
	loader: () => edenFetch(() => api.api.products.feed.get()),
	head: () => ({
		meta: [{ title: "Products — Nexa" }],
	}),
});
