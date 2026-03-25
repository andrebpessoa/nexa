import { Button } from "@nexa/ui/components/button.tsx";
import { Input } from "@nexa/ui/components/input.tsx";
import { Label } from "@nexa/ui/components/label.tsx";
import { useForm } from "@tanstack/react-form";

export interface ProductFormValues {
	name: string;
	description: string;
	priceInCents: number;
}

interface ProductFormProps {
	defaultValues?: ProductFormValues;
	onSubmit: (values: ProductFormValues) => Promise<void>;
	submitLabel: string;
}

export default function ProductForm({
	defaultValues,
	onSubmit,
	submitLabel,
}: ProductFormProps) {
	const form = useForm({
		defaultValues: defaultValues ?? {
			name: "",
			description: "",
			priceInCents: 0,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			className="max-w-lg space-y-4"
		>
			<form.Field name="name">
				{(field) => (
					<div className="space-y-2">
						<Label htmlFor="name">Name</Label>
						<Input
							id="name"
							value={field.state.value}
							onChange={(e) => field.handleChange(e.currentTarget.value)}
							required
						/>
					</div>
				)}
			</form.Field>
			<form.Field name="description">
				{(field) => (
					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Input
							id="description"
							value={field.state.value}
							onChange={(e) => field.handleChange(e.currentTarget.value)}
						/>
					</div>
				)}
			</form.Field>
			<form.Field name="priceInCents">
				{(field) => (
					<div className="space-y-2">
						<Label htmlFor="priceInCents">Price (cents)</Label>
						<Input
							id="priceInCents"
							type="number"
							min={0}
							value={field.state.value}
							onChange={(e) =>
								field.handleChange(Number(e.currentTarget.value))
							}
							required
						/>
					</div>
				)}
			</form.Field>
			<form.Subscribe selector={(state) => state.isSubmitting}>
				{(isSubmitting) => (
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? "Saving..." : submitLabel}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
