import type { Client } from "discord.js";
import { PermissionFlagsBits, TextChannel } from "discord.js";
import { buildPickBanEmbed } from "../components/buildPickBanEmbed";
import { getGuildConfig } from "../db/guildConfig";
import type { StateWithActions } from "../types";

type PostResult = { ok: true } | { ok: false; reason: string };

export async function postPickBanResult(state: StateWithActions, client: Client, guildId: string): Promise<PostResult> {
  const guildConfig = await getGuildConfig(guildId);
  if (!guildConfig?.pickBanResultsChannelId) return { ok: true };

  const resultsChannel = await client.channels.fetch(guildConfig.pickBanResultsChannelId).catch(() => null);
  if (!(resultsChannel instanceof TextChannel)) {
    return { ok: false, reason: "The configured results channel no longer exists or is not a text channel." };
  }

  const botMember = resultsChannel.guild.members.me;
  if (!botMember) return { ok: false, reason: "Bot member not found in guild." };

  const permissions = resultsChannel.permissionsFor(botMember);
  if (!permissions.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
    return {
      ok: false,
      reason: `The bot is missing **View Channel** or **Send Messages** permissions in ${resultsChannel}.`,
    };
  }

  await resultsChannel.send({ embeds: [buildPickBanEmbed(state)] });
  return { ok: true };
}
