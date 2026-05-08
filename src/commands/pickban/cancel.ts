import { type GuildMember, PermissionFlagsBits, type TextChannel } from "discord.js";
import { cancelPickBanState, getActivePickBanState } from "../../db/pickBanState";
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

  const { pickBanMessageId } = pickBanState;
  const pickBanMessage = await interaction.channel?.messages.fetch(pickBanMessageId).catch(() => null);

  await cancelPickBanState(interaction.channelId);
  await pickBanMessage?.edit({ components: [] });

  await interaction.editReply({ content: "Pick/ban session cancelled." });
}
