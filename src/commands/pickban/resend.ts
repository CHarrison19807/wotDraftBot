import { type GuildMember, PermissionFlagsBits, type TextChannel } from "discord.js";
import { buildPickBanButtons } from "../../components/buildPickBanButtons";
import { buildPickBanEmbed } from "../../components/buildPickBanEmbed";
import { getActivePickBanState, updateDraftMessageId } from "../../db/pickBanState";
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

  const { pickBanMessageId } = state;

  const pickBanMessage = await channel.messages.fetch(pickBanMessageId).catch(() => null);

  await pickBanMessage?.delete().catch(() => null);

  const newDraftMessage = await channel.send({
    embeds: [buildPickBanEmbed(state)],
    components: buildPickBanButtons(state),
  });

  await updateDraftMessageId(state.id, newDraftMessage.id);

  await interaction.editReply({ content: "Pick/ban session resent." });
}
