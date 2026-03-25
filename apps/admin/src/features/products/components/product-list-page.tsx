import { Button } from "@nexa/ui/components/button.tsx";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { useProducts } from "@/features/products/hooks/use-products.ts";

export function ProductListPage() {
	const { data: products, isLoading } = useProducts();
	const items = products?.items ?? [];

	if (isLoading) {
		return <p className="text-muted-foreground">Loading products...</p>;
	}

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<h1 className="font-bold text-2xl">Products</h1>
				<Link to="/products/new">
					<Button>
						<Plus size={16} />
						New Product
					</Button>
				</Link>
			</div>
			<div className="rounded-lg border">
				<table className="w-full">
					<thead>
						<tr className="border-b bg-muted/50">
							<th className="px-4 py-3 text-left font-medium text-sm">Name</th>
							<th className="px-4 py-3 text-left font-medium text-sm">Price</th>
							<th className="px-4 py-3 text-left font-medium text-sm">
								Status
							</th>
							<th className="px-4 py-3 text-right font-medium text-sm">
								Actions
							</th>
						</tr>
					</thead>
					<tbody>
						{items.map((product) => (
							<tr key={product.id} className="border-b last:border-0">
								<td className="px-4 py-3 text-sm">{product.name}</td>
								<td className="px-4 py-3 text-sm">
									{(product.priceInCents / 100).toLocaleString("pt-BR", {
										style: "currency",
										currency: "BRL",
									})}
								</td>
								<td className="px-4 py-3 text-sm">
									<span
										className={
											product.active
												? "text-green-500"
												: "text-muted-foreground"
										}
									>
										{product.active ? "Active" : "Inactive"}
									</span>
								</td>
								<td className="px-4 py-3 text-right text-sm">
									<Link
										to="/products/$productId"
										params={{ productId: product.id }}
										className="text-primary hover:underline"
									>
										Edit
									</Link>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
