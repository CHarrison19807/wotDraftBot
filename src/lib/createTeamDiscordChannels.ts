import { ChannelType, type Guild, OverwriteType, PermissionFlagsBits } from "discord.js";
import { TEXT_CHANNEL_ALLOW, VOICE_CHANNEL_ALLOW } from "../constants";

// TODO move to dedicated types
export type PlannedTeam = { name: string; captainDiscordId: string };

export async function createTeamDiscordChannels(
  guild: Guild,
  teams: PlannedTeam[],
  createdChannelIds: string[],
  categoryId: string | null,
): Promise<{ captainDiscordId: string; textChannelId: string; voiceChannelId: string }[]> {
  const results = [];
  for (const team of teams) {
    const textChannel = await guild.channels.create({
      name: team.name,
      type: ChannelType.GuildText,
      parent: categoryId || undefined,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: team.captainDiscordId, type: OverwriteType.Member, allow: TEXT_CHANNEL_ALLOW },
        { id: guild.client.user.id, type: OverwriteType.Member, allow: TEXT_CHANNEL_ALLOW },
      ],
    });

    createdChannelIds.push(textChannel.id);

    const voiceChannel = await guild.channels.create({
      name: team.name,
      type: ChannelType.GuildVoice,
      parent: categoryId || undefined,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: team.captainDiscordId, type: OverwriteType.Member, allow: VOICE_CHANNEL_ALLOW },
        { id: guild.client.user.id, type: OverwriteType.Member, allow: VOICE_CHANNEL_ALLOW },
      ],
    });

    createdChannelIds.push(voiceChannel.id);
    results.push({
      captainDiscordId: team.captainDiscordId,
      textChannelId: textChannel.id,
      voiceChannelId: voiceChannel.id,
    });
  }

  return results;
}
