import {
  ChannelType,
  type ChatInputCommandInteraction,
  MessageFlags,
  OverwriteType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { buildPickBanButtons } from "../components/buildPickBanButtons";
import { buildPickBanEmbed } from "../components/buildPickBanEmbed";
import { fallBackCategoryName, MAP_POOL, PICK_BAN_CONFIGS } from "../constants";
import { cancelPickBanState, createPickBanState, getPickBanState } from "../db/pickBanState";
import { PickBanFormat, PickBanStatus } from "../generated/prisma/client";

export const data = new SlashCommandBuilder()
  .setName("pickban")
  .setDescription("Map pick/ban commands")
  .addSubcommand((sub) =>
    sub
      .setName("start")
      .setDescription("Start a new pick/ban session")
      .addStringOption((opt) =>
        opt
          .setName("format")
          .setDescription("Series format")
          .setRequired(true)
          .addChoices(
            { name: "Bo5", value: PickBanFormat.Bo5 },
            { name: "Bo7", value: PickBanFormat.Bo7 },
            { name: "Bo9", value: PickBanFormat.Bo9 },
            { name: "Bo11", value: PickBanFormat.Bo11 },
          ),
      )
      .addUserOption((opt) => opt.setName("captain_a").setDescription("Team A captain").setRequired(true))
      .addUserOption((opt) => opt.setName("captain_b").setDescription("Team B captain").setRequired(true))
      .addChannelOption((opt) =>
        opt
          .setName("category")
          .setDescription("Category to create the pick/ban channel in")
          .addChannelTypes(ChannelType.GuildCategory)
          .setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("cleanup")
      .setDescription("Delete all pick/ban channels in the category")
      .addStringOption((opt) =>
        opt
          .setName("filter")
          .setDescription("Only delete channels whose name contains this substring")
          .setRequired(false),
      )
      .addChannelOption((opt) =>
        opt
          .setName("category")
          .setDescription("Category to clean up (defaults to Pick-Ban-Sessions)")
          .addChannelTypes(ChannelType.GuildCategory)
          .setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub.setName("resend").setDescription("Resend the pick/ban embed for the active session in this channel"),
  )
  .addSubcommand((sub) => sub.setName("cancel").setDescription("Cancel the active pick/ban session in this channel"));

export const execute = async (interaction: ChatInputCommandInteraction) => {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({ content: "This command can only be used in a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "cleanup") {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.editReply("The bot is missing the **Manage Channels** permission required to delete channels.");
      return;
    }

    const categoryOption = interaction.options.getChannel("category");

    const category =
      categoryOption ||
      guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name === fallBackCategoryName);

    if (!category) {
      await interaction.editReply(`No category found named **${fallBackCategoryName}**.`);
      return;
    }

    const filter = interaction.options.getString("filter");

    const channels = guild.channels.cache.filter(
      (c) =>
        c.type === ChannelType.GuildText &&
        "parentId" in c &&
        c.parentId === category.id &&
        (!filter || c.name.includes(filter)),
    );

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
    return;
  }

  if (subcommand === "resend") {
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
    const botMessages = messages.filter((m) => m.author.id === interaction.client.user.id);
    await Promise.all(botMessages.map((m) => m.delete().catch(() => null)));

    await interaction.reply({ content: "Pick/ban session resent.", flags: MessageFlags.Ephemeral });
    await interaction.channel.send({
      embeds: [buildPickBanEmbed(state)],
      components: buildPickBanButtons(state),
    });
    return;
  }

  if (subcommand === "cancel") {
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
      const botMessage = messages.find((m) => m.author.id === interaction.client.user.id);
      if (botMessage) {
        await botMessage.edit({ embeds: botMessage.embeds.map((e) => e.toJSON()), components: [] });
      }
    }

    await interaction.reply({ content: "Pick/ban session cancelled." });
    return;
  }

  const botMember = guild.members.me;
  if (!botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({
      content: "The bot is missing the **Manage Channels** permission required to create a pick/ban channel.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const format = interaction.options.getString("format", true) as PickBanFormat;
  const captainA = interaction.options.getUser("captain_a", true);
  const captainB = interaction.options.getUser("captain_b", true);
  const categoryOption = interaction.options.getChannel("category");

  if (captainA.id === captainB.id) {
    await interaction.reply({
      content: "Team A and Team B captains must be different users.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply();

  let category =
    categoryOption ||
    guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name === fallBackCategoryName);

  if (!category) {
    category = await guild.channels.create({
      name: fallBackCategoryName,
      type: ChannelType.GuildCategory,
    });
  }

  const channel = await guild.channels.create({
    name: `pickban-${format.toLowerCase()}-${Date.now()}`,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: captainA.id,
        type: OverwriteType.Member,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.UseApplicationCommands,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      {
        id: captainB.id,
        type: OverwriteType.Member,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.UseApplicationCommands,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      {
        id: interaction.client.user.id,
        type: OverwriteType.Member,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
    ],
  });

  const channelId = channel.id;
  const firstStep = PICK_BAN_CONFIGS[format][0];

  if (!firstStep) {
    await channel.delete();
    await interaction.editReply(
      `Invalid format configuration..\nFormat **${format}** does not have any pick/ban steps configured.`,
    );
    return;
  }

  await createPickBanState({
    id: channelId,
    format,
    teamACaptainId: captainA.id,
    teamBCaptainId: captainB.id,
    availableMaps: MAP_POOL.map((m) => m.name),
  });

  const newState = await getPickBanState(channelId);
  if (!newState) {
    await channel.delete();
    await interaction.editReply("Failed to create pick/ban session.");
    return;
  }

  const messageComponents = buildPickBanButtons(newState);
  const messageEmbed = buildPickBanEmbed(newState);

  await channel.send({
    embeds: [messageEmbed],
    components: messageComponents,
  });

  await interaction.editReply(
    `${format} Format\nTeam A Captain: <@${captainA.id}>\nTeam B Captain: <@${captainB.id}>\nPick/ban channel created: ${channel}\nCreated by: <@${interaction.user.id}>`,
  );
};
