import { parse } from "csv-parse/sync";

export interface RosterRow {
  discordUsername: string;
  worldOfTanksId: string;
  isCaptain: boolean;
  isLegionnaire: boolean;
  wotAccountRegion: string;
}

export interface ParseRosterResult {
  players: RosterRow[];
  errors: string[];
}

const TRUTHY = new Set(["true", "1", "yes"]);
function parseBool(raw: string): boolean {
  return TRUTHY.has(raw.trim().toLowerCase());
}

export function parseRoster(csvContent: string): ParseRosterResult {
  const errors: string[] = [];

  let rows: Record<string, string>[];
  try {
    rows = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    }) as Record<string, string>[];
  } catch (err) {
    return {
      players: [],
      errors: [`Failed to parse CSV: ${err instanceof Error ? err.message : String(err)}`],
    };
  }

  const players: RosterRow[] = [];

  let rowNum = 2; // 1-indexed, row 1 is the header
  for (const row of rows) {
    const discordUsername = (row["Discord Username"] ?? "").trim();
    const worldOfTanksId = (row["WoT ID"] ?? "").trim();
    const rowErrors: string[] = [];

    if (!discordUsername) rowErrors.push('missing "Discord Username"');
    if (!worldOfTanksId) rowErrors.push('missing "WoT ID"');

    if (rowErrors.length > 0) {
      errors.push(`Row ${rowNum}: ${rowErrors.join(", ")}`);
    } else {
      players.push({
        discordUsername,
        worldOfTanksId,
        isCaptain: parseBool(row["Is Captain"] ?? ""),
        isLegionnaire: parseBool(row["Is Legionnaire"] ?? ""),
        wotAccountRegion: (row["WoT Account Region"] ?? "").trim().toLowerCase(),
      });
    }

    rowNum++;
  }

  return { players, errors };
}
