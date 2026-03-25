import ProductForm from "@/features/products/components/product-form.tsx";
import { useCreateProduct } from "@/features/products/hooks/use-create-product.ts";

export function ProductNewPage() {
	const createProduct = useCreateProduct();

	return (
		<div>
			<h1 className="mb-6 font-bold text-2xl">New Product</h1>
			<ProductForm
				onSubmit={async (values) => {
					await createProduct.mutateAsync(values);
				}}
				submitLabel="Create Product"
			/>
		</div>
	);
}
