import {
  ChannelType,
  type GuildMember,
  type Message,
  OverwriteType,
  PermissionFlagsBits,
  type TextChannel,
} from "discord.js";
import { buildPickBanButtons } from "../../components/buildPickBanButtons";
import { buildPickBanEmbed } from "../../components/buildPickBanEmbed";
import { MAP_POOL, PICK_BAN_CONFIGS } from "../../constants";
import { createPickBanState, getActivePickBanState, updateTurnNotificationMessageId } from "../../db/pickBanState";
import type { PickBanFormat, WorldOfTanksMapName } from "../../generated/prisma/client";
import { createDiscordChannel } from "../../lib/createDiscordChannel";
import { getTurnNotificationContent } from "../../lib/pickban/getTurnNotificationContent";
import { verifyChannelPermissions } from "../../lib/verifyDiscordPermissions";
import type { GuildChatInputCommandInteraction } from "../../types";

export async function executeStart(
  interaction: GuildChatInputCommandInteraction,
  botMember: GuildMember,
  channel: TextChannel,
) {
  const { guild } = interaction;

  const format = interaction.options.getString("format", true) as PickBanFormat;
  const captainA = interaction.options.getUser("captain_a", true);
  const captainB = interaction.options.getUser("captain_b", true);
  const categoryOption = interaction.options.getChannel("category", false, [ChannelType.GuildCategory]);

  let createdChannel: TextChannel | null = null;

  if (categoryOption) {
    const missingPermissions = verifyChannelPermissions(
      [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
      botMember,
      categoryOption,
    );

    if (missingPermissions) {
      await interaction.editReply(missingPermissions);
      return;
    }

    const idsWithAccess = [
      { id: captainA.id, type: OverwriteType.Member },
      { id: captainB.id, type: OverwriteType.Member },
    ];

    createdChannel = (await createDiscordChannel(
      guild,
      `pickban-${format.toLowerCase()}-${Date.now()}`,
      ChannelType.GuildText,
      categoryOption.id,
      idsWithAccess,
      true,
    )) as TextChannel;
  } else {
    const missingPermissions = verifyChannelPermissions(
      [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
      botMember,
      channel,
    );

    if (missingPermissions) {
      await interaction.editReply(missingPermissions);
      return;
    }

    const existingState = await getActivePickBanState(channel.id);
    if (existingState) {
      await interaction.editReply("A pick/ban session is already active in this channel.");
      return;
    }
  }

  const channelToUse = createdChannel ?? channel;

  let pickBanMessage: Message | null = null;

  try {
    pickBanMessage = await channelToUse.send({ content: "Initializing pick/ban session..." });

    const newState = await createPickBanState({
      channelId: channelToUse.id,
      guildId: guild.id,
      format,
      teamACaptainId: captainA.id,
      teamBCaptainId: captainB.id,
      availableMaps: Object.keys(MAP_POOL) as WorldOfTanksMapName[],
      pickBanMessageId: pickBanMessage.id,
    });

    await pickBanMessage.edit({
      content: null,
      embeds: [buildPickBanEmbed(newState)],
      components: buildPickBanButtons(newState),
    });

    const firstStep = PICK_BAN_CONFIGS[format][0];

    const notificationContent = getTurnNotificationContent(firstStep, captainA.id, captainB.id);
    const notificationMessage = await channelToUse.send(notificationContent);
    await updateTurnNotificationMessageId(newState.id, notificationMessage.id);

    // TODO log to config log channel ...

    await interaction.editReply({
      content: `${format} Format\nTeam A Captain: <@${captainA.id}>\nTeam B Captain: <@${captainB.id}>\nPick/ban channel: ${channelToUse}\nCreated by: <@${interaction.user.id}>`,
    });
  } catch (error) {
    pickBanMessage?.delete().catch(() => null);
    await createdChannel?.delete().catch(() => null);
    await interaction.editReply({ content: "Failed to start pick/ban session." });
    console.error("Error starting pick/ban session:", error);
  }
}
