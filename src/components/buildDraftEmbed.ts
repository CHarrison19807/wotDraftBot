import { EmbedBuilder } from "discord.js";
import type { DraftPlayer, DraftTeam, PlayerDraftSession } from "../generated/prisma/client";
import { getCurrentTeamIndex, isDraftComplete, totalDraftPicks } from "../lib/draft/getDraftTurn";

type DraftSessionWithDetails = PlayerDraftSession & {
  teams: DraftTeam[];
  players: DraftPlayer[];
};

export function buildDraftEmbed(session: DraftSessionWithDetails): EmbedBuilder {
  const { teams, players, currentPickIndex, numTeams, numPlayersPerTeam, draftType } = session;
  const total = totalDraftPicks(numTeams, numPlayersPerTeam);
  const done = isDraftComplete(currentPickIndex, numTeams, numPlayersPerTeam);

  const round = Math.floor(currentPickIndex / numTeams) + 1;
  const pickInRound = (currentPickIndex % numTeams) + 1;

  const currentTeam = done ? null : teams[getCurrentTeamIndex(currentPickIndex, numTeams, draftType)];

  const currentTeamPlayers = currentTeam
    ? players
        .filter((player) => player.teamId === currentTeam.id)
        .sort((a, b) => (a.pickNumber ?? 0) - (b.pickNumber ?? 0))
    : [];

  const lines = currentTeamPlayers.map((player) => {
    const tags: string[] = [];
    if (player.isCaptain) tags.push("C");
    if (player.isLegionnaire) tags.push("L");
    return [`<@${player.discordUserId}>`, ...tags.map((tag) => `[${tag}]`)].join(" ");
  });

  const embed = new EmbedBuilder()
    .setColor(done ? "Green" : "Blue")
    .setTitle(done ? "Draft Complete" : `Round ${round}, Pick ${pickInRound}`)
    .setDescription(
      done
        ? "All players have been drafted."
        : `<@${currentTeam?.captainId}>'s turn to pick, use \`/draft pick\` to select a player`,
    )
    .setFooter({
      text: `${total - currentPickIndex} picks remaining`,
    });

  if (currentTeam) {
    embed.addFields({
      name: `${currentTeam.name} (${currentTeamPlayers.length}/${numPlayersPerTeam})`,
      value: lines.join("\n") || "*No players drafted yet*",
    });
  }

  return embed;
}
