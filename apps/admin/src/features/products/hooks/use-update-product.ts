import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { ProductFormValues } from "@/features/products/components/product-form.tsx";
import { api, edenFetch } from "@/lib/eden.ts";

export function useUpdateProduct(productId: string) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (values: ProductFormValues) =>
			edenFetch(() => api.api.products({ id: productId }).put(values)),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
			toast.success("Product updated");
			navigate({ to: "/products" });
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : "Failed to update product",
			);
		},
	});
}
