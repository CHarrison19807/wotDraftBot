import { MessageFlags } from "discord.js";
import { cancelDraftSession, getAllDraftSessionsByGuildId } from "../../db/draftSession";
import { Status } from "../../generated/prisma/enums";
import { clearPickOrder } from "../../lib/draft/setOrderState";
import type { GuildChatInputCommandInteraction } from "../../types";

export async function executeCancel(interaction: GuildChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const allDraftSessions = await getAllDraftSessionsByGuildId(interaction.guild.id);
  const existing = allDraftSessions.find(
    (session) =>
      session.status === Status.Active || session.status === Status.Pending || session.status === Status.Paused,
  );

  if (!existing) {
    await interaction.editReply("There are no active or pending draft sessions to cancel.");
    return;
  }
  // TODO: logging to config log channel
  try {
    await cancelDraftSession(existing.id);
    clearPickOrder(existing.id);
    await interaction.editReply("Draft session has been cancelled.");
  } catch (error) {
    console.error("Error occurred while canceling draft session:", error);
    await interaction.editReply("An error occurred while trying to cancel the draft session.");
  }
}
