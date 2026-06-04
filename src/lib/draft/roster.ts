import { parse } from "csv-parse/sync";
import type { Guild } from "discord.js";
import { rosterTruthyValues } from "../../constants";
import type { Prisma } from "../../generated/prisma/browser";
import type { WotRegion } from "../../generated/prisma/enums";
import { isWotRegion } from "../guards";

export interface CsvRow {
  discordUsername: string;
  tomatoggLink: string;
  isCaptain: string;
  isLegionnaire: string;
  liquipediaLink: string;
}

export interface ResolvedPlayer {
  discordUsername: string;
  discordUserId: string;
  worldOfTanksId: string;
  isCaptain: boolean;
  isLegionnaire: boolean;
  wotAccountRegion: WotRegion;
}

const COLUMNS = {
  discordUsername: "Discord Username",
  tomatoggLink: "Tomatogg Link",
  isCaptain: "Is Captain",
  isLegionnaire: "Is Legionnaire",
  liquipediaLink: "Liquipedia Link",
} as const;

const REQUIRED_COLUMNS = Object.values(COLUMNS);

function isTruthy(value: string): boolean {
  return rosterTruthyValues.has(value.toLowerCase());
}

function parseTomatoUrl(url: string): { worldOfTanksId: string; wotAccountRegion: WotRegion } | null {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    // /stats/${inGameName}-${worldOfTanksId}/${wotAccountRegion}
    if (parts.length < 3 || parts[0] !== "stats") {
      return null;
    }

    const slug = parts[1];
    const rawRegion = parts[2];

    if (!rawRegion || !slug) {
      return null;
    }

    const lastHyphen = slug.lastIndexOf("-");
    if (lastHyphen === -1) {
      return null;
    }

    const region = rawRegion.charAt(0).toUpperCase() + rawRegion.slice(1).toLowerCase();
    if (!isWotRegion(region)) {
      return null;
    }

    return { worldOfTanksId: slug.slice(lastHyphen + 1), wotAccountRegion: region };
  } catch {
    return null;
  }
}

function cleanField(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function parseRoster(csvContent: string): CsvRow[] {
  const rawRows: Record<string, string>[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  if (rawRows.length === 0) {
    return [];
  }

  const presentColumns = Object.keys(rawRows[0] ?? {});
  const missingColumns = REQUIRED_COLUMNS.filter((col) => !presentColumns.includes(col));
  if (missingColumns.length > 0) {
    throw new Error(`CSV is missing required columns: ${missingColumns.map((column) => `\`${column}\``).join(", ")}`);
  }

  const rows: CsvRow[] = rawRows.map((row) => ({
    discordUsername: cleanField(row[COLUMNS.discordUsername]),
    tomatoggLink: cleanField(row[COLUMNS.tomatoggLink]),
    isCaptain: cleanField(row[COLUMNS.isCaptain]),
    isLegionnaire: cleanField(row[COLUMNS.isLegionnaire]),
    liquipediaLink: cleanField(row[COLUMNS.liquipediaLink]),
  }));

  return rows;
}

function validateCounts(players: { isCaptain: boolean }[], numTeams: number, numPlayersPerTeam: number): string[] {
  const errors: string[] = [];
  const captainCount = players.filter((p) => p.isCaptain).length;
  const expectedNumPlayers = numTeams * numPlayersPerTeam;

  if (captainCount !== numTeams) {
    errors.push(`There must be exactly ${numTeams} captains, but ${captainCount} were found.`);
  }

  if (players.length !== expectedNumPlayers) {
    errors.push(`There must be exactly ${expectedNumPlayers} players, but ${players.length} were found.`);
  }

  return errors;
}

export function validateDraftPlayers(
  players: { isCaptain: boolean }[],
  numTeams: number,
  numPlayersPerTeam: number,
): string[] {
  return validateCounts(players, numTeams, numPlayersPerTeam);
}

export async function resolveRoster(
  guild: Guild,
  players: CsvRow[],
): Promise<{ resolved: Prisma.DraftPlayerCreateManySessionInput[]; errors: string[] }> {
  const members = await guild.members.fetch();
  const errors: string[] = [];
  const resolved: Prisma.DraftPlayerCreateManySessionInput[] = [];
  players.forEach((player, index) => {
    const rowNumber = index + 2; // +2 to account for header and 0-indexing
    const errorPrefix = `Row ${rowNumber} (${player.discordUsername}):`;

    const member = members.find((member) => member.user.username.toLowerCase() === player.discordUsername);

    if (!member) {
      errors.push(
        `${errorPrefix} Could not find Discord member with username "${player.discordUsername}" in the guild.`,
      );
      return;
    }

    const tomatoData = parseTomatoUrl(player.tomatoggLink);

    if (!tomatoData) {
      errors.push(`${errorPrefix} Invalid or missing Tomatogg Link.`);
      return;
    }

    resolved.push({
      discordUsername: player.discordUsername,
      discordUserId: member.user.id,
      worldOfTanksId: tomatoData.worldOfTanksId,
      isCaptain: isTruthy(player.isCaptain),
      isLegionnaire: isTruthy(player.isLegionnaire),
      wotAccountRegion: tomatoData.wotAccountRegion,
    });
  });
  return { resolved, errors };
}
