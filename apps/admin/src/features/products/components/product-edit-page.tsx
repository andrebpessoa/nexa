import ProductForm from "@/features/products/components/product-form.tsx";
import { useProduct } from "@/features/products/hooks/use-product.ts";
import { useUpdateProduct } from "@/features/products/hooks/use-update-product.ts";

interface ProductEditPageProps {
	productId: string;
}

export function ProductEditPage({ productId }: ProductEditPageProps) {
	const { data: product, isLoading } = useProduct(productId);
	const updateProduct = useUpdateProduct(productId);

	if (isLoading) {
		return <p className="text-muted-foreground">Loading product...</p>;
	}

	if (!product) {
		return <p className="text-destructive">Product not found.</p>;
	}

	return (
		<div>
			<h1 className="mb-6 font-bold text-2xl">Edit Product</h1>
			<ProductForm
				defaultValues={{
					name: product.name,
					description: product.description ?? "",
					priceInCents: product.priceInCents,
				}}
				onSubmit={async (values) => {
					await updateProduct.mutateAsync(values);
				}}
				submitLabel="Save Changes"
			/>
		</div>
	);
}
