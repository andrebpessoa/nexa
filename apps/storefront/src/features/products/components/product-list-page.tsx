interface Product {
	id: string;
	name: string;
	description?: string | null;
	priceInCents: number;
}

interface ProductListPageProps {
	products: Product[];
}

export function ProductListPage({ products }: ProductListPageProps) {
	return (
		<div className="container mx-auto max-w-4xl px-4 py-6">
			<h1 className="mb-6 font-bold text-2xl">Products</h1>
			{products.length === 0 ? (
				<p className="text-muted-foreground">No products available.</p>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{products.map((product) => (
						<a
							key={product.id}
							href={`/products/${product.id}`}
							className="rounded-lg border p-4 transition-colors hover:bg-muted"
						>
							<h2 className="font-medium">{product.name}</h2>
							{product.description && (
								<p className="mt-1 text-muted-foreground text-sm">
									{product.description}
								</p>
							)}
							<p className="mt-2 font-semibold">
								{(product.priceInCents / 100).toLocaleString("pt-BR", {
									style: "currency",
									currency: "BRL",
								})}
							</p>
						</a>
					))}
				</div>
			)}
		</div>
	);
}
