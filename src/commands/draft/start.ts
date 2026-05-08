import { ChannelType, MessageFlags, OverwriteType, PermissionFlagsBits } from "discord.js";
import { buildDraftEmbed } from "../../components/buildDraftEmbed";
import { getActiveDraftSession, startDraftSession, updateTeamChannelIds } from "../../db/draftSession";
import { createDiscordChannel } from "../../lib/createDiscordChannel";
import type { GuildChatInputCommandInteraction } from "../../types";

export async function executeStart(interaction: GuildChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const guild = interaction.guild;

  const botMember = guild.members.me;
  if (!botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.editReply(
      "The bot is missing the **Manage Channels** permission required to create draft channels.",
    );
    return;
  }

  const session = await getActiveDraftSession(guild.id);
  if (!session) {
    await interaction.editReply("No active draft session. Run `/draft init` to start one.");
    return;
  }

  if (session.teams.some((t) => t.pickOrder === null)) {
    await interaction.editReply("Draft order not fully set. Use `/draft setorder` to configure it.");
    return;
  }

  const captains = session.players.filter((player) => player.isCaptain);
  const teams = session.teams;
  const createdChannelIds: string[] = [];
  let draftChannelId: string;
  const teamChannelUpdates: { teamId: number; channelId: string; voiceChannelId: string }[] = [];

  try {
    const category = await guild.channels.create({
      name: `Draft - ${session.id}`,
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: botMember.id,
          type: OverwriteType.Member,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels],
        },
      ],
    });
    createdChannelIds.push(category.id);

    draftChannelId = await createDiscordChannel(
      guild,
      "draft-channel",
      ChannelType.GuildText,
      category.id,
      captains.map((player) => ({ id: player.discordUserId, type: OverwriteType.Member })),
      true,
    );
    createdChannelIds.push(draftChannelId);

    const captainChannelId = await createDiscordChannel(
      guild,
      "captains-channel",
      ChannelType.GuildText,
      category.id,
      captains.map((player) => ({ id: player.discordUserId, type: OverwriteType.Member })),
      true,
    );
    createdChannelIds.push(captainChannelId);

    for (const team of teams) {
      const captain = captains.find((player) => player.discordUserId === team.captainId);
      const initialMembers = captain ? [{ id: captain.discordUserId, type: OverwriteType.Member }] : [];

      const textChannelId = await createDiscordChannel(
        guild,
        team.name,
        ChannelType.GuildText,
        category.id,
        initialMembers,
        true,
      );
      createdChannelIds.push(textChannelId);

      const voiceChannelId = await createDiscordChannel(
        guild,
        team.name,
        ChannelType.GuildVoice,
        category.id,
        initialMembers,
        true,
      );
      createdChannelIds.push(voiceChannelId);

      teamChannelUpdates.push({ teamId: team.id, channelId: textChannelId, voiceChannelId });
    }
  } catch (error) {
    console.error("Error creating channels:", error);
    await interaction.editReply(
      "Failed to create channels for the draft session. Please check the bot's permissions and try again.",
    );
    for (const channelId of createdChannelIds) {
      try {
        const channel = await guild.channels.fetch(channelId);
        if (channel) await channel.delete();
      } catch (cleanupError) {
        console.error(`Failed to delete channel ${channelId}:`, cleanupError);
      }
    }
    return;
  }
  await updateTeamChannelIds(session.id, teamChannelUpdates);

  const draftChannel = await guild.channels.fetch(draftChannelId);

  if (!draftChannel?.isTextBased()) {
    await interaction.editReply("Channels created, but failed to locate the draft channel to post the embed.");
    return;
  }

  const draftMessage = await draftChannel.send({ embeds: [buildDraftEmbed(session)] });
  await startDraftSession(session.id, draftChannel.id, draftMessage.id);

  await interaction.editReply(`Draft started! Check <#${draftChannelId}>.`);
}
