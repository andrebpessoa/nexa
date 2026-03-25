import { Body, Container, Head, Html, Preview } from "@react-email/components";

interface LayoutProps {
	preview: string;
	children: React.ReactNode;
}

export function Layout({ preview, children }: LayoutProps) {
	return (
		<Html>
			<Head />
			<Preview>{preview}</Preview>
			<Body
				style={{
					fontFamily:
						'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
					backgroundColor: "#f4f4f5",
					margin: 0,
					padding: "32px 0",
				}}
			>
				<Container
					style={{
						backgroundColor: "#ffffff",
						padding: "32px",
						borderRadius: "8px",
						maxWidth: "560px",
						margin: "0 auto",
					}}
				>
					{children}
				</Container>
			</Body>
		</Html>
	);
}
