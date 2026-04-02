import { ChannelType, type ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits } from "discord.js";
import { fallBackCategoryName } from "../../constants";

export async function executeCleanup(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild!;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.editReply("The bot is missing the **Manage Channels** permission required to delete channels.");
    return;
  }

  const categoryOption = interaction.options.getChannel("category");

  const category =
    categoryOption ??
    guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name === fallBackCategoryName);

  if (!category) {
    await interaction.editReply(`No category found named **${fallBackCategoryName}**.`);
    return;
  }

  const filter = interaction.options.getString("filter", true);

  const channels = guild.channels.cache.filter(
    (c) =>
      c.type === ChannelType.GuildText &&
      "parentId" in c &&
      c.parentId === category.id &&
      c.name.includes(filter),
  );

  if (channels.size === 0) {
    await interaction.editReply("No channels found matching the criteria.");
    return;
  }

  const botMe = guild.members.me;
  const noAccess = channels.filter(
    (c) => "permissionsFor" in c && !c.permissionsFor(botMe!)?.has(PermissionFlagsBits.ViewChannel),
  );

  if (noAccess.size > 0) {
    await interaction.editReply(
      `Missing **View Channel** permission in: ${noAccess.map((c) => c.toString()).join(", ")}. Grant access or remove them manually.`,
    );
    return;
  }

  const results = await Promise.allSettled(channels.map((c) => c.delete()));
  const deleted = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  const reply = [`Deleted ${deleted} channel${deleted === 1 ? "" : "s"}.`];
  if (failed > 0) reply.push(`Failed to delete ${failed} channel${failed === 1 ? "" : "s"}.`);
  
  await interaction.editReply(reply.join(" "));
}
