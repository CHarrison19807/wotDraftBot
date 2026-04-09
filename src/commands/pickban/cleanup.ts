import { ChannelType, MessageFlags, PermissionFlagsBits, type TextChannel } from "discord.js";
import type { GuildChatInputCommandInteraction } from "./index";

export async function executeCleanup(interaction: GuildChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const { guild, botMember } = interaction;

  if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.editReply("The bot is missing the **Manage Channels** permission required to delete channels.");
    return;
  }

  const categoryOption = interaction.options.getChannel("category", true, [ChannelType.GuildCategory]);
  const filter = interaction.options.getString("filter", true);

  const channelsToDelete = guild.channels.cache.filter(
    (channel): channel is TextChannel =>
      channel.type === ChannelType.GuildText && channel.parentId === categoryOption.id && channel.name.includes(filter),
  );

  if (channelsToDelete.size === 0) {
    await interaction.editReply("No channels found matching the criteria.");
    return;
  }

  const noAccess = channelsToDelete.filter(
    (channel) => !channel.permissionsFor(botMember).has(PermissionFlagsBits.ViewChannel),
  );

  if (noAccess.size > 0) {
    await interaction.editReply(
      `Missing **View Channel** permission for the following channels:\n${noAccess.map((channel) => channel.toString()).join("\n")}\nGrant access or remove them manually.`,
    );
    // TODO - decide if want to remove the channels we have access to, for now don't delete any if any fail the permission check
    return;
  }

  const results = await Promise.allSettled(channelsToDelete.map((channel) => channel.delete()));
  const deleted = results.filter((result) => result.status === "fulfilled").length;
  const failed = results.filter((result) => result.status === "rejected").length;

  const reply = [`Deleted ${deleted} channel${deleted === 1 ? "" : "s"}.`];
  if (failed > 0) reply.push(`Failed to delete ${failed} channel${failed === 1 ? "" : "s"}.`);

  await interaction.editReply(reply.join("\n"));
}
