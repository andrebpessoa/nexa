import { createFileRoute } from "@tanstack/react-router";

import { ProductEditPage } from "@/features/products/index.ts";

export const Route = createFileRoute("/products/$productId")({
	component: function EditProductRoute() {
		const { productId } = Route.useParams();
		return <ProductEditPage productId={productId} />;
	},
});
