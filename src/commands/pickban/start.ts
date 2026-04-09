import { ChannelType, MessageFlags, OverwriteType, PermissionFlagsBits } from "discord.js";
import { buildPickBanButtons } from "../../components/buildPickBanButtons";
import { buildPickBanEmbed } from "../../components/buildPickBanEmbed";
import { MAP_POOL, PICK_BAN_CONFIGS } from "../../constants";
import { createPickBanState, getPickBanState } from "../../db/pickBanState";
import type { PickBanFormat } from "../../generated/prisma/client";
import type { GuildChatInputCommandInteraction } from "./index";

export async function executeStart(interaction: GuildChatInputCommandInteraction) {
  const { guild, botMember } = interaction;

  if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({
      content: "The bot is missing the **Manage Channels** permission required to create a pick/ban channel.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const format = interaction.options.getString("format", true) as PickBanFormat;
  const captainA = interaction.options.getUser("captain_a", true);
  const captainB = interaction.options.getUser("captain_b", true);
  const categoryOption = interaction.options.getChannel("category", true);

  if (captainA.id === captainB.id) {
    await interaction.reply({
      content: "Team A and Team B captains must be different users.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply();

  const channel = await guild.channels.create({
    name: `pickban-${format.toLowerCase()}-${Date.now()}`,
    type: ChannelType.GuildText,
    parent: categoryOption.id,
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
    availableMaps: MAP_POOL.map((map) => map.name),
  });

  const newState = await getPickBanState(channelId);

  if (!newState) {
    await channel.delete();
    await interaction.editReply("Failed to create pick/ban session.");
    return;
  }

  await channel.send({
    embeds: [buildPickBanEmbed(newState)],
    components: buildPickBanButtons(newState),
  });

  await interaction.editReply(
    `${format} Format\nTeam A Captain: <@${captainA.id}>\nTeam B Captain: <@${captainB.id}>\nPick/ban channel created: ${channel}\nCreated by: <@${interaction.user.id}>`,
  );
}
