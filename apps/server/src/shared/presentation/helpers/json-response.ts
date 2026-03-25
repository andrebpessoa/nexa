export const jsonResponse = <T>(data: T, status = 200): Response =>
	new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
