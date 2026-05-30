import { cancelDraftSession, getPendingDraftSession } from "../../db/draftSession";
import type { GuildChatInputCommandInteraction } from "../../types";

export async function executeClear(interaction: GuildChatInputCommandInteraction) {
  const pendingSession = await getPendingDraftSession(interaction.guild.id);
  if (!pendingSession) {
    await interaction.editReply("No pending session found to clear.");
    return;
  }

  await cancelDraftSession(pendingSession.id);

  await interaction.editReply("The pending session has been cancelled and all roster data has been cleared.");
}
