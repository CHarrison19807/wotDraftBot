import { type GuildMember, MessageFlags, PermissionFlagsBits, TextChannel } from "discord.js";
import { buildPickBanButtons } from "../../components/buildPickBanButtons";
import { buildPickBanEmbed } from "../../components/buildPickBanEmbed";
import { getPickBanState, updateDraftMessageId } from "../../db/pickBanState";
import type { GuildChatInputCommandInteraction } from "../../types";

export async function executeResend(interaction: GuildChatInputCommandInteraction, botMember: GuildMember) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const state = await getPickBanState(interaction.channelId);

  if (!state) {
    await interaction.editReply({
      content: "No active pick/ban session in this channel.",
    });
    return;
  }

  if (!(interaction.channel instanceof TextChannel)) {
    await interaction.editReply({ content: "Command must be run in a guild text channel." });
    return;
  }

  const channelPerms = interaction.channel.permissionsFor(botMember);

  const missingPerms = (
    [
      [PermissionFlagsBits.ViewChannel, "View Channel"],
      [PermissionFlagsBits.ReadMessageHistory, "Read Message History"],
      [PermissionFlagsBits.SendMessages, "Send Messages"],
    ] as const
  )
    .filter(([flag]) => !channelPerms.has(flag))
    .map(([, name]) => `**${name}**`);

  if (missingPerms.length > 0) {
    await interaction.editReply({
      content: `The bot is missing the following permissions in this channel: ${missingPerms.join(", ")}.`,
    });
    return;
  }

  const { draftMessageId } = state;

  const draftMessage = await interaction.channel.messages.fetch(draftMessageId).catch(() => null);

  if (draftMessage) {
    await draftMessage.delete().catch(() => null);
  }

  const newDraftMessage = await interaction.channel.send({
    embeds: [buildPickBanEmbed(state)],
    components: buildPickBanButtons(state),
  });

  await updateDraftMessageId(state.id, newDraftMessage.id);

  await interaction.editReply({ content: "Pick/ban session resent." });
}
