import { MessageFlags, TextChannel } from "discord.js";
import { cancelPickBanState, getPickBanState } from "../../db/pickBanState";
import { PickBanStatus } from "../../generated/prisma/client";
import type { GuildChatInputCommandInteraction } from "./index";

export async function executeCancel(interaction: GuildChatInputCommandInteraction) {
  const state = await getPickBanState(interaction.channelId);

  if (!state) {
    await interaction.reply({
      content: "No active pick/ban session in this channel.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (state.status !== PickBanStatus.Active) {
    await interaction.reply({ content: "This pick/ban session is not active.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.channel instanceof TextChannel) {
    const messages = await interaction.channel.messages.fetch({ limit: 100 });
    const draftMessage = messages.find(
      (message) => message.author.id === interaction.client.user.id && message.embeds.length > 0,
    );
    if (draftMessage) {
      await draftMessage.edit({ embeds: draftMessage.embeds.map((embed) => embed.toJSON()), components: [] });
    }
  }

  await cancelPickBanState(interaction.channelId);

  await interaction.reply({ content: "Pick/ban session cancelled." });
}
