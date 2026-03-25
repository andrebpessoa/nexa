import "reflect-metadata";
import { createAuth } from "@nexa/auth";
import { db } from "@nexa/db";
import { container } from "tsyringe";
import { redisClient } from "./shared/infra/cache/redis-client.ts";

container.register("Database", { useValue: db });
container.register("CacheClient", { useValue: redisClient });

const auth = createAuth();
container.register("Auth", { useValue: auth });

export { container };
