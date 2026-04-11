import type { ChatInputCommandInteraction } from "discord.js";
import type { GuildChatInputCommandInteraction } from "../types";

export function refineInteraction(interaction: ChatInputCommandInteraction): GuildChatInputCommandInteraction | null {
  if (!interaction.guild) return null;

  const botMember = interaction.guild.members.me;
  if (!botMember) return null;

  const refinedInteraction = interaction as GuildChatInputCommandInteraction;
  refinedInteraction.botMember = botMember;

  return refinedInteraction;
}
