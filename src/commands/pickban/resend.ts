import { MessageFlags, PermissionFlagsBits, TextChannel } from "discord.js";
import { buildPickBanButtons } from "../../components/buildPickBanButtons";
import { buildPickBanEmbed } from "../../components/buildPickBanEmbed";
import { getPickBanState } from "../../db/pickBanState";
import type { GuildChatInputCommandInteraction } from "./index";

export async function executeResend(interaction: GuildChatInputCommandInteraction) {
  const { botMember } = interaction;

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

  const messages = await interaction.channel.messages.fetch({ limit: 100 });
  const botPickBanStateMessages = messages.filter(
    (message) => message.author.id === interaction.client.user.id && message.embeds.length > 0,
  );
  await Promise.all(botPickBanStateMessages.map((message) => message.delete().catch(() => null)));

  await interaction.reply({ content: "Pick/ban session resent.", flags: MessageFlags.Ephemeral });
  await interaction.channel.send({
    embeds: [buildPickBanEmbed(state)],
    components: buildPickBanButtons(state),
  });
}
