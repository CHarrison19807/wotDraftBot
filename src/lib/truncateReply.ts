const DISCORD_MAX_LENGTH = 2000;
const TRUNCATION_SUFFIX = "\n… (truncated)";

export function truncateReply(content: string): string {
  if (content.length <= DISCORD_MAX_LENGTH) return content;
  return content.slice(0, DISCORD_MAX_LENGTH - TRUNCATION_SUFFIX.length) + TRUNCATION_SUFFIX;
}
