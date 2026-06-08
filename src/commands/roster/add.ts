import { upsertDraftPlayer } from "../../db/draftPlayer";
import { getPendingDraftSession } from "../../db/draftSession";
import type { WotRegion } from "../../generated/prisma/browser";
import type { GuildChatInputCommandInteraction } from "../../types";

export async function executeAdd(interaction: GuildChatInputCommandInteraction) {
  const pendingSession = await getPendingDraftSession(interaction.guild.id);

  if (!pendingSession) {
    await interaction.editReply("No pending draft session found in this server.");
    return;
  }

  const user = interaction.options.getUser("player", true);

  const worldOfTanksId = interaction.options.getString("wot_id", true);
  const wotAccountRegion = interaction.options.getString("region", true) as WotRegion;
  const isCaptain = interaction.options.getBoolean("is_captain") ?? false;
  const isLegionnaire = interaction.options.getBoolean("is_legionnaire") ?? false;

  try {
    await upsertDraftPlayer({
      sessionId: pendingSession.id,
      discordUserId: user.id,
      discordUsername: user.username,
      worldOfTanksId,
      isCaptain,
      isLegionnaire,
      wotAccountRegion,
    });
  } catch (error) {
    console.error("Error adding draft player:", error);
    await interaction.editReply("An error occurred while adding the player. Please try again.");
    return;
  }

  await interaction.editReply(`Player <@${user.id}> added to the draft session.`);
}
