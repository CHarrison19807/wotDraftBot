import { type GuildMember, PermissionFlagsBits, type TextChannel } from "discord.js";
import { buildPickBanEmbed } from "../../components/buildPickBanEmbed";
import { cancelPickBanState, getActivePickBanState } from "../../db/pickBanState";
import { Status } from "../../generated/prisma/enums";
import { verifyChannelPermissions } from "../../lib/verifyDiscordPermissions";
import type { GuildChatInputCommandInteraction } from "../../types";

export async function executeCancel(
  interaction: GuildChatInputCommandInteraction,
  botMember: GuildMember,
  channel: TextChannel,
) {
  const missingPermissions = verifyChannelPermissions(
    [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
    botMember,
    channel,
  );

  if (missingPermissions) {
    await interaction.editReply({ content: missingPermissions });
    return;
  }

  const pickBanState = await getActivePickBanState(interaction.channelId);

  if (!pickBanState) {
    await interaction.editReply({ content: "No active pick/ban session in this channel." });
    return;
  }

  const { pickBanMessageId, turnNotificationMessageId } = pickBanState;
  const pickBanMessage = await interaction.channel?.messages.fetch(pickBanMessageId).catch(() => null);

  if (turnNotificationMessageId) {
    const turnNotificationMessage = await interaction.channel?.messages
      .fetch(turnNotificationMessageId)
      .catch(() => null);
    await turnNotificationMessage?.delete().catch(() => null);
  }

  await cancelPickBanState(interaction.channelId);
  const cancelledPickBanState = { ...pickBanState, status: Status.Cancelled };
  await pickBanMessage?.edit({ embeds: [buildPickBanEmbed(cancelledPickBanState)], components: [] });

  await interaction.editReply({ content: "Pick/ban session cancelled." });
}
