/**
 * Cleans env-provided Anthropic keys (trim, strip quotes, remove accidental whitespace).
 */
export function normalizeAnthropicApiKey(key: string): string {
  return key
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, "");
}

/**
 * API key for Claude — **server environment only** (never read from the browser).
 * Set `ANTHROPIC_API_KEY` or `CV_ANTHROPIC_KEY` in `.env.local` (dev) or your host’s env (production).
 */
export function getServerAnthropicApiKey(): string {
  return normalizeAnthropicApiKey(
    process.env.ANTHROPIC_API_KEY || process.env.CV_ANTHROPIC_KEY || ""
  );
}
