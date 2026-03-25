import { Button } from "@nexa/ui/components/button.tsx";
import { Input } from "@nexa/ui/components/input.tsx";
import { Label } from "@nexa/ui/components/label.tsx";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client.ts";

export function LoginPage() {
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();

	useEffect(() => {
		if (session?.user.role === "admin") {
			navigate({ to: "/products" });
		}
	}, [session, navigate]);

	if (session?.user.role === "admin") return null;

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			await authClient.signIn.email(
				{
					email: value.email,
					password: value.password,
				},
				{
					onSuccess: () => {
						navigate({ to: "/products" });
					},
					onError: (ctx) => {
						toast.error(ctx.error.message);
					},
				},
			);
		},
	});

	return (
		<div className="flex h-svh items-center justify-center">
			<div className="w-full max-w-sm space-y-6 rounded-lg border p-6">
				<div className="text-center">
					<h1 className="font-bold text-2xl">Nexa Admin</h1>
					<p className="text-muted-foreground text-sm">
						Sign in with your admin account
					</p>
				</div>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<form.Field name="email">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									type="email"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.currentTarget.value)}
									required
								/>
							</div>
						)}
					</form.Field>
					<form.Field name="password">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="password">Password</Label>
								<Input
									id="password"
									type="password"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.currentTarget.value)}
									required
								/>
							</div>
						)}
					</form.Field>
					<form.Subscribe selector={(state) => state.isSubmitting}>
						{(isSubmitting) => (
							<Button type="submit" className="w-full" disabled={isSubmitting}>
								{isSubmitting ? "Signing in..." : "Sign In"}
							</Button>
						)}
					</form.Subscribe>
				</form>
				{session && session.user.role !== "admin" && (
					<p className="text-center text-destructive text-sm">
						Your account does not have admin access.
					</p>
				)}
			</div>
		</div>
	);
}
