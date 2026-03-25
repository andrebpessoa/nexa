import { Button as REButton } from "@react-email/components";

interface EmailButtonProps {
	href: string;
	children: React.ReactNode;
}

export function EmailButton({ href, children }: EmailButtonProps) {
	return (
		<REButton
			href={href}
			style={{
				backgroundColor: "#18181b",
				color: "#ffffff",
				padding: "12px 24px",
				borderRadius: "6px",
				fontSize: "14px",
				fontWeight: 600,
				textDecoration: "none",
				display: "inline-block",
			}}
		>
			{children}
		</REButton>
	);
}
