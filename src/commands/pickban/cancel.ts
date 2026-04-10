import { MessageFlags, TextChannel } from "discord.js";
import { cancelPickBanState, getPickBanState } from "../../db/pickBanState";
import { PickBanStatus } from "../../generated/prisma/client";
import type { GuildChatInputCommandInteraction } from "../../types";

export async function executeCancel(interaction: GuildChatInputCommandInteraction) {
  const state = await getPickBanState(interaction.channelId);

  if (!state) {
    await interaction.reply({
      content: "No active pick/ban session in this channel.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const { status, draftMessageId } = state;

  if (status !== PickBanStatus.Active) {
    await interaction.reply({ content: "This pick/ban session is not active.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.channel instanceof TextChannel) {
    const draftMessage = await interaction.channel.messages.fetch(draftMessageId).catch(() => null);

    if (draftMessage) {
      await draftMessage.edit({ components: [] });
    }
  }

  await cancelPickBanState(interaction.channelId);

  await interaction.reply({ content: "Pick/ban session cancelled." });
}
