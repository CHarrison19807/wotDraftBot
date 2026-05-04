import { parse } from "csv-parse/sync";

export interface RosterRow {
  discordUsername: string;
  worldOfTanksId: string;
  isCaptain: string;
  isLegionnaire: string;
  wotAccountRegion: string;
}

export interface ParseRosterResult {
  rows: RosterRow[];
  errors: string[];
}

const REQUIRED_COLUMNS = ["Discord Username", "WoT ID", "Is Captain", "Is Legionnaire", "WoT Account Region"];

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
    discordUsername: cleanField(row["Discord Username"]),
    worldOfTanksId: cleanField(row["WoT ID"]),
    isCaptain: cleanField(row["Is Captain"]),
    isLegionnaire: cleanField(row["Is Legionnaire"]),
    wotAccountRegion: cleanField(row["WoT Account Region"]),
  }));

  return { rows, errors: [] };
}
