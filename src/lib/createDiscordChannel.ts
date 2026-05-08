import {
  ChannelType,
  type Guild,
  OverwriteType,
  PermissionFlagsBits,
  type TextChannel,
  type VoiceChannel,
} from "discord.js";
import { TEXT_CHANNEL_ALLOW, VOICE_CHANNEL_ALLOW } from "../constants";

export async function createDiscordChannel(
  guild: Guild,
  name: string,
  channelType: ChannelType.GuildText | ChannelType.GuildVoice,
  categoryId: string,
  idsWithAccess: { id: string; type: OverwriteType }[],
  isPrivate = false,
): Promise<TextChannel | VoiceChannel> {
  const isVoice = channelType === ChannelType.GuildVoice;
  const allow = isVoice ? VOICE_CHANNEL_ALLOW : TEXT_CHANNEL_ALLOW;
  const deny = isPrivate ? [PermissionFlagsBits.ViewChannel] : [];

  const channel = await guild.channels.create({
    name,
    type: channelType,
    parent: categoryId,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny },
      ...idsWithAccess.map(({ id, type }) => ({ id, type, allow })),
      { id: guild.client.user.id, type: OverwriteType.Member, allow },
    ],
  });

  return channel;
}
