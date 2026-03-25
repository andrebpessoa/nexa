import { createFileRoute } from "@tanstack/react-router";

import { ProductDetailPage } from "@/features/products/index.ts";
import { api, edenFetch } from "@/lib/eden.ts";

export const Route = createFileRoute("/products/$productId")({
	component: function ProductDetailRoute() {
		const product = Route.useLoaderData();
		return <ProductDetailPage product={product} />;
	},
	loader: ({ params }) =>
		edenFetch(() => api.api.products.feed({ id: params.productId }).get()),
	head: ({ loaderData }) => ({
		meta: [{ title: `${loaderData?.name ?? "Product"} — Nexa` }],
	}),
});
