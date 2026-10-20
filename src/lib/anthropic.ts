import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | undefined;

/** Lazy so a missing key fails the request that needs it, not the build. */
export const getClient = (): Anthropic => {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  client = new Anthropic({ apiKey });
  return client;
};
