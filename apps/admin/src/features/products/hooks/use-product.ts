import { useQuery } from "@tanstack/react-query";

import { api, edenFetch } from "@/lib/eden.ts";

export function useProduct(productId: string) {
	return useQuery({
		queryKey: ["admin", "products", productId],
		queryFn: () => edenFetch(() => api.api.products({ id: productId }).get()),
	});
}
