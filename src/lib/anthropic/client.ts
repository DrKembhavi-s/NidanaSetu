import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const INTERPRETATION_MODEL = "claude-sonnet-5";

let client: Anthropic | null = null;

export function getAnthropicClient() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}
