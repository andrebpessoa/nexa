import { useQuery } from "@tanstack/react-query";

import { api, edenFetch } from "@/lib/eden.ts";

export function useProducts() {
	return useQuery({
		queryKey: ["admin", "products"],
		queryFn: () => edenFetch(() => api.api.products.get()),
	});
}
