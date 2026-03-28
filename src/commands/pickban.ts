import {
  ChannelType,
  type ChatInputCommandInteraction,
  MessageFlags,
  OverwriteType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { MAP_POOL, PICK_BAN_CONFIGS } from "../constants";
import { createPickBanState } from "../db/pickban";
import { PickBanFormat } from "../generated/prisma/client";

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
  );

export const execute = async (interaction: ChatInputCommandInteraction) => {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({ content: "This command can only be used in a server.", flags: MessageFlags.Ephemeral });
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

  const fallBackCategoryName = "Pick-Ban-Sessions";
  const sessionId = crypto.randomUUID().slice(0, 8);

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
    name: `pickban-${format.toLowerCase()}-${sessionId}`,
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

  const firstStep = PICK_BAN_CONFIGS[format]?.[0];

  if (!firstStep) {
    await channel.delete();
    await interaction.editReply(
      `Invalid format configuration..\nFormat **${format}** does not have any pick/ban steps configured.`,
    );
    return;
  }

  const message = await channel.send({
    content: `**${format}** pick/ban\nTeam A Captain: <@${captainA.id}>\nTeam B Captain: <@${captainB.id}>\n\n<@${firstStep.actingTeam === "TeamA" ? captainA.id : captainB.id}> — **${firstStep.action}** a map.`,
  });

  await createPickBanState({
    id: sessionId,
    channelId: channel.id,
    format,
    teamACaptainId: captainA.id,
    teamBCaptainId: captainB.id,
    availableMaps: MAP_POOL.map((m) => m.name),
    messageId: message.id,
  });

  await interaction.editReply(
    `${format} Format\nTeam A Captain: <@${captainA.id}>\nTeam B Captain: <@${captainB.id}>\nPick/ban channel created: ${channel}\nCreated by: <@${interaction.user.id}>`,
  );
};
