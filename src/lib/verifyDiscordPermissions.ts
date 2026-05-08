import type { GuildMember, TextChannel } from "discord.js";
import { REQUIRED_PERMISSIONS } from "../constants";

export function verifyChannelPermissions(
  requiredPermissions: bigint[],
  botMember: GuildMember,
  channel: TextChannel,
): string {
  const channelPerms = channel.permissionsFor(botMember);
  const missingPermissions = requiredPermissions.filter((perm) => !channelPerms.has(perm));

  return missingPermissions
    .map(
      (perm) =>
        `The bot is missing the **${REQUIRED_PERMISSIONS.get(perm) ?? "Unknown"}** permission in <#${channel.id}>.`,
    )
    .join("\n");
}

export function verifyGuildPermissions(requiredPermissions: bigint[], botMember: GuildMember): string {
  const missingPermissions = requiredPermissions.filter((perm) => !botMember.permissions.has(perm));

  return missingPermissions
    .map((perm) => `The bot is missing the **${REQUIRED_PERMISSIONS.get(perm) ?? "Unknown"}** permission.`)
    .join("\n");
}
