import { type GuildMember, PermissionFlagsBits, type TextChannel } from "discord.js";
import { buildPickBanButtons } from "../../components/buildPickBanButtons";
import { buildPickBanEmbed } from "../../components/buildPickBanEmbed";
import { PICK_BAN_CONFIGS } from "../../constants";
import { getActivePickBanState, updateDraftMessageId, updateTurnNotificationMessageId } from "../../db/pickBanState";
import { getTurnNotificationContent } from "../../lib/pickban/getTurnNotificationContent";
import { verifyChannelPermissions } from "../../lib/verifyDiscordPermissions";
import type { GuildChatInputCommandInteraction } from "../../types";

export async function executeResend(
  interaction: GuildChatInputCommandInteraction,
  botMember: GuildMember,
  channel: TextChannel,
) {
  const state = await getActivePickBanState(interaction.channelId);

  if (!state) {
    await interaction.editReply({ content: "No active pick/ban session in this channel." });
    return;
  }

  const missingPermissions = verifyChannelPermissions(
    [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
    botMember,
    channel,
  );

  if (missingPermissions) {
    await interaction.editReply({ content: missingPermissions });
    return;
  }

  const { pickBanMessageId, turnNotificationMessageId, currentStepIndex, format, id, teamACaptainId, teamBCaptainId } =
    state;

  if (turnNotificationMessageId) {
    const notificationMessage = await channel.messages.fetch(turnNotificationMessageId).catch(() => null);
    await notificationMessage?.delete().catch(() => null);
  }

  const pickBanMessage = await channel.messages.fetch(pickBanMessageId).catch(() => null);

  await pickBanMessage?.delete().catch(() => null);

  const newDraftMessage = await channel.send({
    embeds: [buildPickBanEmbed(state)],
    components: buildPickBanButtons(state),
  });

  const step = PICK_BAN_CONFIGS[format][currentStepIndex];

  if (step) {
    const notificationContent = getTurnNotificationContent(step, teamACaptainId, teamBCaptainId);
    const notificationMessage = await channel.send(notificationContent);
    await updateTurnNotificationMessageId(id, notificationMessage.id);
  }

  await updateDraftMessageId(state.id, newDraftMessage.id);

  await interaction.editReply({ content: "Pick/ban session resent." });
}
