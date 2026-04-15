import { ChannelType, type GuildMember, MessageFlags, PermissionFlagsBits, TextChannel } from "discord.js";
import { setPickBanResultsChannel } from "../../db/guildConfig";
import type { GuildChatInputCommandInteraction } from "../../types";

export async function executeSet(interaction: GuildChatInputCommandInteraction, botMember: GuildMember) {
  const channelOption = interaction.options.getChannel("results-channel", true, [ChannelType.GuildText]);
  const channel = interaction.guild.channels.cache.get(channelOption.id);

  if (!(channel instanceof TextChannel)) {
    await interaction.reply({ content: "Could not resolve the selected channel.", flags: MessageFlags.Ephemeral });
    return;
  }
  const requiredPermissions = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages];
  const botPermissions = channel.permissionsFor(botMember);
  const missingPermissions = requiredPermissions.filter((perm) => !botPermissions.has(perm));

  if (missingPermissions.length > 0) {
    const permissionLabels = new Map([
      [PermissionFlagsBits.ViewChannel, "View Channel"],
      [PermissionFlagsBits.SendMessages, "Send Messages"],
    ]);
    const permissionNames = missingPermissions.map(
      (perm) => `**${permissionLabels.get(perm) ?? `Unknown (${perm})`}**`,
    );

    await interaction.reply({
      content: `The bot is missing the following permissions in ${channel}: ${permissionNames.join(", ")}.\nGrant these permissions and try again.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await setPickBanResultsChannel(interaction.guild.id, channel.id);

  await interaction.reply({
    content: `Pick/ban results channel set to ${channel}.`,
    flags: MessageFlags.Ephemeral,
  });
}
