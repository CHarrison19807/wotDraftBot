import { MessageFlags } from "discord.js";
import { cancelDraftSession, getActiveDraftSession } from "../../db/draftSession";
import { clearSetOrder } from "../../lib/draft/setOrderState";
import type { GuildChatInputCommandInteraction } from "../../types";

export async function executeCancel(interaction: GuildChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const existing = await getActiveDraftSession(interaction.guild.id);

  if (!existing) {
    await interaction.editReply("No active draft session to cancel in this guild.");
    return;
  }

  try {
    await cancelDraftSession(existing.id);
    clearSetOrder(existing.id);
    await interaction.editReply("Draft session has been cancelled.");
  } catch (error) {
    console.error("Error occurred while canceling draft session:", error);
    await interaction.editReply("An error occurred while trying to cancel the draft session.");
  }
}
