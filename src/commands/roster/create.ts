import {
  addPlayersToExistingSession,
  createDraftSessionWithPlayers,
  getActiveDraftSession,
  getPendingDraftSession,
} from "../../db/draftSession";
import { Status } from "../../generated/prisma/client";
import { type CsvRow, parseRoster, resolveRoster } from "../../lib/draft/roster";
import { truncateReply } from "../../lib/truncateReply";
import type { GuildChatInputCommandInteraction } from "../../types";

export async function executeCreate(interaction: GuildChatInputCommandInteraction) {
  const csvAttachment = interaction.options.getAttachment("roster_csv", true);

  const csvResponse = await fetch(csvAttachment.url);
  if (!csvResponse.ok) {
    await interaction.editReply("Failed to download the roster CSV.");
    return;
  }

  const csvContent = await csvResponse.text();
  let rosterRows: CsvRow[];

  try {
    rosterRows = parseRoster(csvContent);
  } catch {
    await interaction.editReply("Failed to parse the roster CSV.");
    return;
  }

  if (rosterRows.length === 0) {
    await interaction.editReply("The roster CSV contains no players.");
    return;
  }

  const { resolved, errors: resolveErrors } = await resolveRoster(interaction.guild, rosterRows);
  if (resolveErrors.length > 0) {
    await interaction.editReply(
      truncateReply(`Failed to resolve Discord members:\n${resolveErrors.map((e) => `- ${e}`).join("\n")}`),
    );
    return;
  }

  const pendingSession = await getPendingDraftSession(interaction.guild.id);

  if (pendingSession) {
    try {
      await addPlayersToExistingSession(pendingSession.id, resolved);
    } catch (error) {
      console.error("Error adding players to existing session:", error);
      await interaction.editReply("An error occurred while adding players to the session. Please try again.");
      return;
    }
    await interaction.editReply(`Added ${resolved.length} players to the existing session.`);
    return;
  }

  const activeSession = await getActiveDraftSession(interaction.guild.id);
  if (activeSession) {
    await interaction.editReply("A session is already active. Cancel it before creating a new one.");
    return;
  }

  try {
    await createDraftSessionWithPlayers({ guildId: interaction.guild.id, status: Status.Pending }, resolved);
  } catch (error) {
    console.error("Error creating draft session:", error);
    await interaction.editReply("An error occurred while creating the session. Please try again.");
    return;
  }

  await interaction.editReply(`Session created with ${resolved.length} players.`);
}
