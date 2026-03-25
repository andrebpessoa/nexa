import { Heading, Hr, Text } from "@react-email/components";
import { EmailButton } from "./components/button.tsx";
import { Layout } from "./components/layout.tsx";

interface ResetPasswordEmailProps {
	url: string;
	userName: string;
}

export function ResetPasswordEmail({ url, userName }: ResetPasswordEmailProps) {
	return (
		<Layout preview="Redefina sua senha">
			<Heading as="h1" style={{ fontSize: "24px", color: "#18181b" }}>
				Olá, {userName}
			</Heading>
			<Text style={{ fontSize: "14px", color: "#3f3f46", lineHeight: "24px" }}>
				Recebemos uma solicitação para redefinir a senha da sua conta. Clique no
				botão abaixo para criar uma nova senha:
			</Text>
			<EmailButton href={url}>Redefinir senha</EmailButton>
			<Hr style={{ borderColor: "#e4e4e7", margin: "24px 0" }} />
			<Text style={{ fontSize: "12px", color: "#a1a1aa" }}>
				Se você não solicitou a redefinição de senha, ignore este email. O link
				expira em 1 hora.
			</Text>
		</Layout>
	);
}
