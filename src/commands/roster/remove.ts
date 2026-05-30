import { deleteDraftPlayer, getDraftPlayerByDiscordId } from "../../db/draftPlayer";
import { getPendingDraftSession } from "../../db/draftSession";
import type { GuildChatInputCommandInteraction } from "../../types";

export async function executeRemove(interaction: GuildChatInputCommandInteraction) {
  const pendingSession = await getPendingDraftSession(interaction.guild.id);

  if (!pendingSession) {
    await interaction.editReply("No pending draft session found in this server.");
    return;
  }

  const user = interaction.options.getUser("player", true);
  const deletedPlayer = await deleteDraftPlayer(pendingSession.id, user.id);

  if (!deletedPlayer) {
    await interaction.editReply(`Player <@${user.id}> is not part of the pending draft session.`);
    return;
  }

  await interaction.editReply(`Player <@${user.id}> has been removed from the pending draft session.`);
}
