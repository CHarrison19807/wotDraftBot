import {
  addPlayersToPendingSession,
  createDraftSessionWithPlayers,
  getActiveDraftSession,
  getPendingDraftSession,
} from "../../db/draftSession";
import { Status } from "../../generated/prisma/client";
import { CsvRow, parseRoster, resolveRoster } from "../../lib/draft/roster";
import { getRandomTankNames } from "../../lib/draft/tankNames";
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
  } catch (error) {
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
    await addPlayersToPendingSession(pendingSession.id, resolved);
    await interaction.editReply(`Added ${resolved.length} players to the existing session.`);
    return;
  }

  const activeSession = await getActiveDraftSession(interaction.guild.id);
  if (activeSession) {
    await interaction.editReply("A session is already active. Cancel it before creating a new one.");
    return;
  }

  await createDraftSessionWithPlayers({ guildId: interaction.guild.id, status: Status.Pending }, resolved);

  await interaction.editReply(`Session created with ${resolved.length} players.`);
}
