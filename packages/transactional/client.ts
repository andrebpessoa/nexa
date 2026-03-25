import nodemailer from "nodemailer";

export interface EmailClientConfig {
	host: string;
	port: number;
	secure: boolean;
	auth: {
		user: string;
		pass: string;
	};
	from: string;
}

export interface EmailMessage {
	to: string | string[];
	subject: string;
	html: string;
}

export interface EmailClient {
	send(message: EmailMessage): Promise<void>;
}

export function createEmailClient(config: EmailClientConfig): EmailClient {
	const transport = nodemailer.createTransport({
		host: config.host,
		port: config.port,
		secure: config.secure,
		auth: config.auth,
	});

	return {
		async send(message) {
			await transport.sendMail({
				from: config.from,
				to: message.to,
				subject: message.subject,
				html: message.html,
			});
		},
	};
}
