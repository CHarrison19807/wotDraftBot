import { ChannelType, type Guild, OverwriteType, PermissionFlagsBits } from "discord.js";

const TEXT_ALLOW = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.UseApplicationCommands,
  PermissionFlagsBits.ReadMessageHistory,
];

const VOICE_ALLOW = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.Connect,
  PermissionFlagsBits.Speak,
  PermissionFlagsBits.Stream,
  PermissionFlagsBits.UseVAD,
];

const BOT_TEXT_ALLOW = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory,
];

const BOT_VOICE_ALLOW = [PermissionFlagsBits.ViewChannel];

export async function createDiscordChannel(
  guild: Guild,
  name: string,
  channelType: ChannelType.GuildText | ChannelType.GuildVoice,
  categoryId: string,
  idsWithAccess: { id: string; type: OverwriteType }[],
  isPrivate = false,
): Promise<string> {
  const isVoice = channelType === ChannelType.GuildVoice;
  const memberAllow = isVoice ? VOICE_ALLOW : TEXT_ALLOW;
  const botAllow = isVoice ? BOT_VOICE_ALLOW : BOT_TEXT_ALLOW;
  const deny = isPrivate ? [PermissionFlagsBits.ViewChannel] : [];

  const channel = await guild.channels.create({
    name,
    type: channelType,
    parent: categoryId,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny },
      ...idsWithAccess.map(({ id, type }) => ({ id, type, allow: memberAllow })),
      { id: guild.client.user.id, type: OverwriteType.Member, allow: botAllow },
    ],
  });

  return channel.id;
}
