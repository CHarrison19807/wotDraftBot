import { ChannelType, type Guild, OverwriteType, PermissionFlagsBits } from "discord.js";
import { TEXT_CHANNEL_ALLOW } from "../constants";
import { createTeamDiscordChannels, type PlannedTeam } from "./createTeamDiscordChannels";

export async function createSessionDiscordChannels(
  guild: Guild,
  sessionId: string,
  teams: PlannedTeam[],
): Promise<{
  draftChannelId: string;
  categoryId: string;
  captainsChannelId: string;
  teamChannelUpdates: { captainDiscordId: string; textChannelId: string; voiceChannelId: string }[];
}> {
  const createdChannelIds: string[] = [];

  try {
    const category = await guild.channels.create({
      name: `Draft - ${sessionId}`,
      type: ChannelType.GuildCategory,
    });

    createdChannelIds.push(category.id);

    const draftChannel = await guild.channels.create({
      name: "draft-channel",
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.SendMessages] },
        { id: guild.client.user.id, type: OverwriteType.Member, allow: TEXT_CHANNEL_ALLOW },
      ],
    });

    createdChannelIds.push(draftChannel.id);

    const captainsChannel = await guild.channels.create({
      name: "captains-channel",
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: guild.client.user.id, type: OverwriteType.Member, allow: TEXT_CHANNEL_ALLOW },
        ...teams.map((team) => ({ id: team.captainDiscordId, type: OverwriteType.Member, allow: TEXT_CHANNEL_ALLOW })),
      ],
    });

    createdChannelIds.push(captainsChannel.id);

    const teamChannelUpdates = await createTeamDiscordChannels(guild, teams, createdChannelIds, category.id);
    return {
      draftChannelId: draftChannel.id,
      categoryId: category.id,
      captainsChannelId: captainsChannel.id,
      teamChannelUpdates,
    };
  } catch (error) {
    for (const channelId of createdChannelIds) {
      try {
        await guild.channels.delete(channelId);
      } catch {}
    }
    throw error;
  }
}
