import { MessageFlags } from "discord.js";
import { createDraftSessionWithPlayers, getActiveDraftSession } from "../../db/draftSession";
import { parseRoster } from "../../lib/draft/parseRoster";
import { resolveRoster } from "../../lib/draft/resolveRoster";
import { getRandomTankNames } from "../../lib/draft/tankNames";
import { validateRoster } from "../../lib/draft/validateRoster";
import { isDraftType } from "../../lib/guards";
import { truncateReply } from "../../lib/truncateReply";
import type { GuildChatInputCommandInteraction } from "../../types";

export async function executeInit(interaction: GuildChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const numTeams = interaction.options.getInteger("num_teams", true);
  const maxPlayersPerTeam = interaction.options.getInteger("max_players_per_team", true);
  const draftType = interaction.options.getString("draft_type", true);

  if (!isDraftType(draftType)) {
    await interaction.editReply("Invalid draft type.");
    return;
  }

  const existing = await getActiveDraftSession(interaction.guild.id);
  if (existing) {
    await interaction.editReply("A draft session already exists in this guild. Cancel it before creating a new one.");
    return;
  }

  const csvAttachment = interaction.options.getAttachment("roster", true);
  const csvResponse = await fetch(csvAttachment.url);
  if (!csvResponse.ok) {
    await interaction.editReply("Failed to download the roster CSV.");
    return;
  }
  const csvContent = await csvResponse.text();

  const { rows: rosterRows, errors: parseErrors } = parseRoster(csvContent);
  if (parseErrors.length > 0) {
    await interaction.editReply(truncateReply(`CSV errors:\n${parseErrors.map((e) => `- ${e}`).join("\n")}`));
    return;
  }

  if (rosterRows.length === 0) {
    await interaction.editReply("The roster CSV contains no players.");
    return;
  }

  const validationErrors = validateRoster(rosterRows, numTeams, maxPlayersPerTeam);
  if (validationErrors.length > 0) {
    await interaction.editReply(
      truncateReply(`Roster validation errors:\n${validationErrors.map((e) => `- ${e}`).join("\n")}`),
    );
    return;
  }

  const { resolved, errors: resolveErrors } = await resolveRoster(interaction.guild, rosterRows);
  if (resolveErrors.length > 0) {
    await interaction.editReply(
      truncateReply(`Failed to resolve Discord members:\n${resolveErrors.map((e) => `- ${e}`).join("\n")}`),
    );
    return;
  }

  const teamNames = await getRandomTankNames(numTeams);
  const captainRows = resolved.filter((player) => player.isCaptain);

  const teamData = captainRows.map((captain, i): { name: string; captainId: string } => ({
    name: teamNames[i] ?? `Team ${i + 1}`,
    captainId: captain.discordUserId,
  }));

  await createDraftSessionWithPlayers(
    { guildId: interaction.guild.id, channelId: interaction.channelId, numTeams, maxPlayersPerTeam, draftType },
    resolved,
    teamData,
  );

  await interaction.editReply(
    `Draft session created with ${numTeams} teams. Run \`/draft setorder\` to set the captain pick order.`,
  );
}
