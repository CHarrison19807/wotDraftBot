import { type ChatInputCommandInteraction, type GuildMember, TextChannel } from "discord.js";
import type { GuildChatInputCommandInteraction } from "../types";

export type VerifiedInteraction = {
  interaction: GuildChatInputCommandInteraction;
  botMember: GuildMember;
  channel: TextChannel;
};

export function verifyInteraction(interaction: ChatInputCommandInteraction): VerifiedInteraction | null {
  if (!interaction.guild) return null;

  const botMember = interaction.guild.members.me;
  if (!botMember) return null;

  const channel = interaction.channel;
  if (!(channel instanceof TextChannel)) return null;

  return { interaction: interaction as GuildChatInputCommandInteraction, botMember, channel };
}
