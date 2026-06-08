import { deleteDraftPlayer } from "../../db/draftPlayer";
import { getPendingDraftSession } from "../../db/draftSession";
import type { GuildChatInputCommandInteraction } from "../../types";

export async function executeRemove(interaction: GuildChatInputCommandInteraction) {
  const pendingSession = await getPendingDraftSession(interaction.guild.id);

  if (!pendingSession) {
    await interaction.editReply("No pending draft session found in this server.");
    return;
  }

  const user = interaction.options.getUser("player", true);

  let deletedPlayer: { count: number };
  try {
    deletedPlayer = await deleteDraftPlayer(pendingSession.id, user.id);
  } catch (error) {
    console.error("Error removing draft player:", error);
    await interaction.editReply("An error occurred while removing the player. Please try again.");
    return;
  }

  if (deletedPlayer.count === 0) {
    await interaction.editReply(`Player <@${user.id}> is not part of the pending draft session.`);
    return;
  }

  await interaction.editReply(`Player <@${user.id}> has been removed from the pending draft session.`);
}
