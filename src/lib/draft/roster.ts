import { parse } from "csv-parse/sync";
import type { Guild } from "discord.js";
import { rosterFalsyValues, rosterTruthyValues, validRegions } from "../../constants";

export interface RosterRow {
  discordUsername: string;
  tomatoggLink: string;
  isCaptain: string;
  isLegionnaire: string;
  liquipediaLink: string;
}

export interface ParseRosterResult {
  rows: RosterRow[];
  errors: string[];
}

export interface ResolvedPlayer {
  discordUsername: string;
  discordUserId: string;
  worldOfTanksId: string;
  isCaptain: boolean;
  isLegionnaire: boolean;
  wotAccountRegion: string;
}

function isTruthy(value: string): boolean {
  return rosterTruthyValues.has(value.toLowerCase());
}

function isFalsy(value: string): boolean {
  return rosterFalsyValues.has(value.toLowerCase());
}

function parseTomatoUrl(url: string): { worldOfTanksId: string; wotAccountRegion: string } | null {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    // /stats/${inGameName}-${worldOfTanksId}/${wotAccountRegion}
    if (parts.length < 3 || parts[0] !== "stats") {
      return null;
    }

    const slug = parts[1];
    const region = parts[2];

    if (!region || !slug) {
      return null;
    }

    const lastHyphen = slug.lastIndexOf("-");
    if (lastHyphen === -1) {
      return null;
    }

    if (!validRegions.has(region.toLowerCase())) {
      return null;
    }

    return { worldOfTanksId: slug.slice(lastHyphen + 1), wotAccountRegion: region };
  } catch {
    return null;
  }
}

const COLUMNS = {
  discordUsername: "Discord Username",
  tomatoggLink: "Tomatogg Link",
  isCaptain: "Is Captain",
  isLegionnaire: "Is Legionnaire",
  liquipediaLink: "Liquipedia Link",
} as const;

const REQUIRED_COLUMNS = Object.values(COLUMNS);

function cleanField(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function parseRoster(csvContent: string): ParseRosterResult {
  let rawRows: Record<string, string>[];
  try {
    rawRows = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  } catch (err) {
    return {
      rows: [],
      errors: [`Failed to parse CSV: ${err instanceof Error ? err.message : String(err)}`],
    };
  }

  if (rawRows.length === 0) {
    return { rows: [], errors: [] };
  }

  const presentColumns = Object.keys(rawRows[0] ?? {});
  const missingColumns = REQUIRED_COLUMNS.filter((col) => !presentColumns.includes(col));
  if (missingColumns.length > 0) {
    return {
      rows: [],
      errors: [`CSV is missing required columns: ${missingColumns.map((column) => `\`${column}\``).join(", ")}`],
    };
  }

  const rows: RosterRow[] = rawRows.map((row) => ({
    discordUsername: cleanField(row[COLUMNS.discordUsername]),
    tomatoggLink: cleanField(row[COLUMNS.tomatoggLink]),
    isCaptain: cleanField(row[COLUMNS.isCaptain]),
    isLegionnaire: cleanField(row[COLUMNS.isLegionnaire]),
    liquipediaLink: cleanField(row[COLUMNS.liquipediaLink]),
  }));

  return { rows, errors: [] };
}

export function validateRoster(rows: RosterRow[], numTeams: number, numPlayersPerTeam: number): string[] {
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const { discordUsername, tomatoggLink, isCaptain, isLegionnaire } = row;
    const rowNumber = index + 2; // +2 to account for header and 0-indexing
    const errorPrefix = `Row ${rowNumber}:`;

    if (!discordUsername) {
      errors.push(`${errorPrefix} Missing value for \`Discord Username\`.`);
    }

    if (!tomatoggLink) {
      errors.push(`${errorPrefix} Missing value for \`Tomatogg Link\`.`);
    }

    if (!isFalsy(isCaptain) && !isTruthy(isCaptain)) {
      errors.push(`${errorPrefix} Invalid value for \`Is Captain\`.`);
    }

    if (!isFalsy(isLegionnaire) && !isTruthy(isLegionnaire)) {
      errors.push(`${errorPrefix} Invalid value for \`Is Legionnaire\`.`);
    }
  });

  const captains = rows.filter((r) => isTruthy(r.isCaptain));
  const expectedNumPlayers = numTeams * numPlayersPerTeam;

  if (captains.length !== numTeams) {
    errors.push(`There must be exactly ${numTeams} captains, but ${captains.length} were found.`);
  }

  if (rows.length !== expectedNumPlayers) {
    errors.push(`There must be exactly ${expectedNumPlayers} players, but ${rows.length} were found.`);
  }

  return errors;
}

export async function resolveRoster(
  guild: Guild,
  players: RosterRow[],
): Promise<{ resolved: ResolvedPlayer[]; errors: string[] }> {
  const members = await guild.members.fetch();
  const errors: string[] = [];
  const resolved: ResolvedPlayer[] = [];
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
