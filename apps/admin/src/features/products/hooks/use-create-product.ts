import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { ProductFormValues } from "@/features/products/components/product-form.tsx";
import { api, edenFetch } from "@/lib/eden.ts";

export function useCreateProduct() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (values: ProductFormValues) =>
			edenFetch(() => api.api.products.post(values)),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
			toast.success("Product created");
			navigate({ to: "/products" });
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : "Failed to create product",
			);
		},
	});
}
