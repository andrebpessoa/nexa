import "reflect-metadata";
import { createPostHogServerErrorTracker } from "@nexa/analytics/posthog/server";
import { createAuth } from "@nexa/auth";
import { db } from "@nexa/db";
import { env } from "@nexa/env/server";
import { createEmailClient } from "@nexa/transactional";
import { container } from "tsyringe";
import { redisClient } from "./shared/infra/cache/redis-client.ts";

container.register("Database", { useValue: db });
container.register("CacheClient", { useValue: redisClient });
container.register("ErrorTracker", {
	useValue: createPostHogServerErrorTracker({
		apiKey: env.POSTHOG_KEY,
		host: env.POSTHOG_HOST,
	}),
});

const emailClient = createEmailClient({
	host: env.SMTP_HOST,
	port: env.SMTP_PORT,
	secure: env.SMTP_SECURE,
	auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
	from: env.EMAIL_FROM,
});

const auth = createAuth({ emailClient });
container.register("Auth", { useValue: auth });

export { container };
