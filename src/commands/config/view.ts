import { MessageFlags } from "discord.js";
import { getGuildConfig } from "../../db/guildConfig";
import type { GuildChatInputCommandInteraction } from "../../types";

export async function executeView(interaction: GuildChatInputCommandInteraction) {
  const config = await getGuildConfig(interaction.guild.id);

  const resultsChannel = config?.pickBanResultsChannelId ? `<#${config.pickBanResultsChannelId}>` : "Not set";

  await interaction.reply({
    content: `**Pick/ban results channel:** ${resultsChannel}`,
    flags: MessageFlags.Ephemeral,
  });
}
