import { MessageFlags, PermissionFlagsBits, TextChannel } from "discord.js";
import { buildPickBanButtons } from "../../components/buildPickBanButtons";
import { buildPickBanEmbed } from "../../components/buildPickBanEmbed";
import { getPickBanState, updateDraftMessageId } from "../../db/pickBanState";
import type { GuildChatInputCommandInteraction } from "../../types";

export async function executeResend(interaction: GuildChatInputCommandInteraction) {
  const { botMember } = interaction;

  interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const state = await getPickBanState(interaction.channelId);

  if (!state) {
    await interaction.reply({
      content: "No active pick/ban session in this channel.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!(interaction.channel instanceof TextChannel)) {
    await interaction.reply({ content: "Command must be run in a guild text channel.", flags: MessageFlags.Ephemeral });
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
    await interaction.reply({
      content: `The bot is missing the following permissions in this channel: ${missingPerms.join(", ")}.`,
      flags: MessageFlags.Ephemeral,
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

  await interaction.reply({ content: "Pick/ban session resent.", flags: MessageFlags.Ephemeral });
}
