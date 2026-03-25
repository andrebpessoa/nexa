import { Heading, Hr, Text } from "@react-email/components";
import { Layout } from "./components/layout.tsx";

interface OrderConfirmationEmailProps {
	orderId: string;
	userName: string;
}

export function OrderConfirmationEmail({
	orderId,
	userName,
}: OrderConfirmationEmailProps) {
	return (
		<Layout preview={`Pedido ${orderId} confirmado`}>
			<Heading as="h1" style={{ fontSize: "24px", color: "#18181b" }}>
				Pedido confirmado!
			</Heading>
			<Text style={{ fontSize: "14px", color: "#3f3f46", lineHeight: "24px" }}>
				Olá, {userName}. Seu pedido <strong>#{orderId}</strong> foi confirmado
				com sucesso.
			</Text>
			<Hr style={{ borderColor: "#e4e4e7", margin: "24px 0" }} />
			<Text style={{ fontSize: "12px", color: "#a1a1aa" }}>
				Você receberá atualizações sobre o status do seu pedido por email.
			</Text>
		</Layout>
	);
}
