import { type ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits } from "discord.js";
import { buildPickBanButtons } from "../../components/buildPickBanButtons";
import { buildPickBanEmbed } from "../../components/buildPickBanEmbed";
import { getPickBanState } from "../../db/pickBanState";

export async function executeResend(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild!;

  const state = await getPickBanState(interaction.channelId);

  if (!state) {
    await interaction.reply({
      content: "No active pick/ban session in this channel.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!interaction.channel || !("send" in interaction.channel)) {
    await interaction.reply({ content: "Command must be run in a guild text channel.", flags: MessageFlags.Ephemeral });
    return;
  }

  const botMember = guild.members.me;
  const channelPerms =
    botMember && "permissionsFor" in interaction.channel ? interaction.channel.permissionsFor(botMember) : null;

  const missingPerms = (
    [
      [PermissionFlagsBits.ViewChannel, "View Channel"],
      [PermissionFlagsBits.ReadMessageHistory, "Read Message History"],
      [PermissionFlagsBits.SendMessages, "Send Messages"],
    ] as const
  )
    .filter(([flag]) => !channelPerms?.has(flag))
    .map(([, name]) => `**${name}**`);

  if (missingPerms.length > 0) {
    await interaction.reply({
      content: `The bot is missing the following permissions in this channel: ${missingPerms.join(", ")}.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const messages = await interaction.channel.messages.fetch({ limit: 100 });
  const botMessages = messages.filter((m) => m.author.id === interaction.client.user.id && m.embeds.length > 0);
  await Promise.all(botMessages.map((m) => m.delete().catch(() => null)));

  await interaction.reply({ content: "Pick/ban session resent.", flags: MessageFlags.Ephemeral });
  await interaction.channel.send({
    embeds: [buildPickBanEmbed(state)],
    components: buildPickBanButtons(state),
  });
}
