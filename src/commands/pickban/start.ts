import { ChannelType, MessageFlags, OverwriteType, PermissionFlagsBits, TextChannel } from "discord.js";
import { buildPickBanButtons } from "../../components/buildPickBanButtons";
import { buildPickBanEmbed } from "../../components/buildPickBanEmbed";
import { MAP_POOL, PICK_BAN_CONFIGS } from "../../constants";
import { createPickBanState, getPickBanState, updateTurnNotificationMessageId } from "../../db/pickBanState";
import { type PickBanFormat, PickBanStatus } from "../../generated/prisma/client";
import { getTurnNotificationContent } from "../../lib/getTurnNotificationContent";
import type { GuildChatInputCommandInteraction } from "../../types";

export async function executeStart(interaction: GuildChatInputCommandInteraction) {
  const { guild, botMember } = interaction;

  const format = interaction.options.getString("format", true) as PickBanFormat;
  const captainA = interaction.options.getUser("captain_a", true);
  const captainB = interaction.options.getUser("captain_b", true);
  const categoryOption = interaction.options.getChannel("category", false, [ChannelType.GuildCategory]);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (captainA.id === captainB.id) {
    await interaction.editReply("Team A and Team B captains must be different users.");
    return;
  }

  let channel: TextChannel;
  let createdChannel = false;

  if (categoryOption) {
    if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.editReply(
        "The bot is missing the **Manage Channels** permission required to create a pick/ban channel.",
      );
      return;
    }

    channel = await guild.channels.create({
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
    createdChannel = true;
  } else {
    if (!(interaction.channel instanceof TextChannel)) {
      await interaction.editReply("This command must be run in a text channel.");
      return;
    }

    const permissions = interaction.channel.permissionsFor(botMember);
    if (!permissions.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
      await interaction.editReply(
        "The bot is missing **View Channel** or **Send Messages** permissions in this channel.",
      );
      return;
    }

    const existingState = await getPickBanState(interaction.channel.id);
    if (existingState?.status === PickBanStatus.Active) {
      await interaction.editReply("A pick/ban session is already active in this channel.");
      return;
    }

    channel = interaction.channel;
  }

  const firstStep = PICK_BAN_CONFIGS[format][0];
  if (!firstStep) {
    if (createdChannel) await channel.delete();
    await interaction.editReply(
      `Invalid format configuration.\nFormat **${format}** does not have any pick/ban steps configured.`,
    );
    return;
  }

  const draftMessage = await channel.send({ content: "Initializing pick/ban session..." });

  await createPickBanState({
    id: channel.id,
    guildId: guild.id,
    format,
    teamACaptainId: captainA.id,
    teamBCaptainId: captainB.id,
    availableMaps: MAP_POOL.map((map) => map.name),
    draftMessageId: draftMessage.id,
  });

  const newState = await getPickBanState(channel.id);
  if (!newState) {
    if (createdChannel) await channel.delete();
    await interaction.editReply("Failed to create pick/ban session.");
    return;
  }

  const message = await channel.messages.fetch(draftMessage.id);
  await message.edit({
    content: null,
    embeds: [buildPickBanEmbed(newState)],
    components: buildPickBanButtons(newState),
  });

  const notificationContent = getTurnNotificationContent(firstStep, captainA.id, captainB.id);
  const notificationMessage = await channel.send(notificationContent);
  await updateTurnNotificationMessageId(channel.id, notificationMessage.id);

  await interaction.followUp({
    content: `${format} Format\nTeam A Captain: <@${captainA.id}>\nTeam B Captain: <@${captainB.id}>\nPick/ban channel: ${channel}\nCreated by: <@${interaction.user.id}>`,
  });
}
