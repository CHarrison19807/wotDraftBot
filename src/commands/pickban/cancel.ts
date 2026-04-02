import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { cancelPickBanState, getPickBanState } from "../../db/pickBanState";
import { PickBanStatus } from "../../generated/prisma/client";

export async function executeCancel(interaction: ChatInputCommandInteraction) {
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

  await cancelPickBanState(interaction.channelId);

  if (interaction.channel && "messages" in interaction.channel) {
    const messages = await interaction.channel.messages.fetch({ limit: 100 });
    const draftMessage = messages.find((m) => m.author.id === interaction.client.user.id && m.embeds.length > 0);
    if (draftMessage) {
      await draftMessage.edit({ embeds: draftMessage.embeds.map((e) => e.toJSON()), components: [] });
    }
  }

  await interaction.reply({ content: "Pick/ban session cancelled." });
}
