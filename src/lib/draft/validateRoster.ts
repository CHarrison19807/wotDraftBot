import { rosterFalsyValues, rosterTruthyValues, validRegions } from "../../constants";
import type { RosterRow } from "./parseRoster";

export function isTruthy(value: string): boolean {
  return rosterTruthyValues.has(value.toLowerCase());
}

export function isFalsy(value: string): boolean {
  return rosterFalsyValues.has(value.toLowerCase());
}

export function validateRoster(rows: RosterRow[], numTeams: number, numPlayersPerTeam: number): string[] {
  const errors: string[] = [];

  for (const row of rows) {
    const { discordUsername, worldOfTanksId, isCaptain, isLegionnaire, wotAccountRegion } = row;
    const rowNumber = rows.indexOf(row) + 2; // +2 to account for header and 0-indexing
    const errorPrefix = `Row ${rowNumber}:`;

    if (!discordUsername) {
      errors.push(`${errorPrefix} Missing value for \`Discord Username\`.`);
    }

    if (!worldOfTanksId) {
      errors.push(`${errorPrefix} Missing value for \`World of Tanks ID\`.`);
    }

    if (!isFalsy(isCaptain) && !isTruthy(isCaptain)) {
      errors.push(`${errorPrefix} Invalid value for \`Is Captain\`.`);
    }

    if (!isFalsy(isLegionnaire) && !isTruthy(isLegionnaire)) {
      errors.push(`${errorPrefix} Invalid value for \`Is Legionnaire\`.`);
    }

    if (!wotAccountRegion) {
      errors.push(`${errorPrefix} Missing value for \`WoT Account Region\`.`);
    } else if (!validRegions.has(wotAccountRegion)) {
      errors.push(
        `${errorPrefix} Invalid value for \`WoT Account Region\`. Must be one of: ${[...validRegions].join(", ")}.`,
      );
    }
  }

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
