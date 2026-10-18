import { Redis } from "@upstash/redis";

let client: Redis | undefined;

/** Lazy for the same reason as getDb: a missing env var fails the request, not the build. */
export const getRedis = (): Redis => {
  if (client) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set");
  client = new Redis({ url, token });
  return client;
};
