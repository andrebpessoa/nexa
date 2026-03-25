import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/mysql2";
import { reset, seed } from "drizzle-seed";
import * as schema from "../schema/index.ts";
import { relations } from "../schema/relations.ts";
import { productSeedPreset } from "./tables/product.seed.ts";

dotenv.config({
	path: new URL("../../../../apps/server/.env", import.meta.url).pathname,
});

async function main() {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error("DATABASE_URL is required to run db:seed.");
	}

	const db = drizzle({
		connection: {
			uri: databaseUrl,
		},
		schema,
		relations,
		mode: "default",
	});

	try {
		await reset(db, schema);

		await seed(db, schema, { count: 0 }).refine((funcs) => ({
			product: {
				count: productSeedPreset.count,
				columns: {
					id: funcs.uuid(),
					name: funcs.valuesFromArray({
						values: [...productSeedPreset.names],
						isUnique: true,
					}),
					description: funcs.valuesFromArray({
						values: [...productSeedPreset.descriptions],
					}),
					priceInCents: funcs.int({
						minValue: productSeedPreset.minPriceInCents,
						maxValue: productSeedPreset.maxPriceInCents,
					}),
					active: funcs.default({
						defaultValue: productSeedPreset.defaultActive,
					}),
				},
			},
		}));

		console.log(`Seed completed with ${productSeedPreset.count} products.`);
	} finally {
		await db.$client.end();
	}
}

main().catch((error) => {
	console.error("Seed failed.");
	console.error(error);
	process.exit(1);
});
