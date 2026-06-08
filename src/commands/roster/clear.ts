import { cancelDraftSession, getPendingDraftSession } from "../../db/draftSession";
import type { GuildChatInputCommandInteraction } from "../../types";

export async function executeClear(interaction: GuildChatInputCommandInteraction) {
  const pendingSession = await getPendingDraftSession(interaction.guild.id);
  if (!pendingSession) {
    await interaction.editReply("No pending session found to clear.");
    return;
  }

  try {
    await cancelDraftSession(pendingSession.id);
  } catch (error) {
    console.error("Error cancelling draft session:", error);
    await interaction.editReply("An error occurred while clearing the session. Please try again.");
    return;
  }

  await interaction.editReply("The pending session has been cancelled and all roster data has been cleared.");
}
