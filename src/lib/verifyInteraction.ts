import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import type { GuildChatInputCommandInteraction } from "../types";

export type verifiedInteraction = {
  interaction: GuildChatInputCommandInteraction;
  botMember: GuildMember;
};

export function verifyInteraction(interaction: ChatInputCommandInteraction): verifiedInteraction | null {
  if (!interaction.guild) return null;

  const botMember = interaction.guild.members.me;
  if (!botMember) return null;

  return { interaction: interaction as GuildChatInputCommandInteraction, botMember };
}
