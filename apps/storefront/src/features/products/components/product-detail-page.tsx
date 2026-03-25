interface Product {
	id: string;
	name: string;
	description?: string | null;
	priceInCents: number;
}

interface ProductDetailPageProps {
	product: Product | null | undefined;
}

export function ProductDetailPage({ product }: ProductDetailPageProps) {
	if (!product) {
		return (
			<div className="container mx-auto max-w-2xl px-4 py-6">
				<p className="text-destructive">Product not found.</p>
			</div>
		);
	}

	return (
		<div className="container mx-auto max-w-2xl px-4 py-6">
			<a
				href="/products"
				className="mb-4 inline-block text-muted-foreground text-sm hover:underline"
			>
				&larr; Back to products
			</a>
			<h1 className="mb-2 font-bold text-3xl">{product.name}</h1>
			{product.description && (
				<p className="mb-4 text-muted-foreground">{product.description}</p>
			)}
			<p className="font-semibold text-2xl">
				{(product.priceInCents / 100).toLocaleString("pt-BR", {
					style: "currency",
					currency: "BRL",
				})}
			</p>
		</div>
	);
}
