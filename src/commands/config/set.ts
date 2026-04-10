import { ChannelType, MessageFlags, PermissionFlagsBits, TextChannel } from "discord.js";
import { setPickBanResultsChannel } from "../../db/guildConfig";
import type { GuildChatInputCommandInteraction } from "../../types";

export async function executeSet(interaction: GuildChatInputCommandInteraction) {
  const channelOption = interaction.options.getChannel("results-channel", true, [ChannelType.GuildText]);
  const channel = interaction.guild.channels.cache.get(channelOption.id);

  if (!(channel instanceof TextChannel)) {
    await interaction.reply({ content: "Could not resolve the selected channel.", flags: MessageFlags.Ephemeral });
    return;
  }
  const requiredPermissions = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages];
  const botPermissions = channel.permissionsFor(interaction.botMember);
  const missingPermissions = requiredPermissions.filter((perm) => !botPermissions.has(perm));

  if (missingPermissions.length > 0) {
    const permissionNames = missingPermissions.map((perm) => {
      if (perm === PermissionFlagsBits.ViewChannel) return "**View Channel**";
      if (perm === PermissionFlagsBits.SendMessages) return "**Send Messages**";
    });

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
