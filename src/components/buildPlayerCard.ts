import { EmbedBuilder } from "discord.js";
import type { DraftPlayer, DraftTeam } from "../generated/prisma/client";
import { buildTomatoLink } from "../lib/buildTomatoLink";

export function buildPlayerCard(player: DraftPlayer, team: DraftTeam | null): EmbedBuilder {
  const lines: string[] = [];

  lines.push(`**WoT ID:** ${player.worldOfTanksId}`);
  lines.push(`**Region:** ${player.wotAccountRegion.toUpperCase()}`);

  const badges: string[] = [];
  if (player.isCaptain) badges.push("Captain");
  if (player.isLegionnaire) badges.push("Legionnaire");
  if (badges.length) lines.push(badges.join(" | "));

  lines.push("");
  lines.push(`Tomato.gg: ${buildTomatoLink(player.worldOfTanksId, player.wotAccountRegion)}`);
  // TODO need tomatogg api ...
  // lines.push("stats");

  lines.push("");
  lines.push(team ? `**Drafted to:** ${team.name}` : "**Status:** Available");

  return new EmbedBuilder()
    .setTitle(player.discordUsername)
    .setDescription(lines.join("\n"))
    .setColor(player.isLegionnaire ? 0xffa500 : 0x5865f2);
}
