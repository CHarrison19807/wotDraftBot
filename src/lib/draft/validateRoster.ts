import type { RosterRow } from "./parseRoster";

const VALID_REGIONS = new Set(["na", "eu", "asia"]);

export function validateRoster(players: RosterRow[], numTeams: number): string[] {
  const errors: string[] = [];

  for (const player of players) {
    if (player.wotAccountRegion && !VALID_REGIONS.has(player.wotAccountRegion)) {
      errors.push(`"${player.discordUsername}": invalid region "${player.wotAccountRegion}" - expected NA/EU/RU/ASIA`);
    }
  }

  const captainCount = players.filter((p) => p.isCaptain).length;
  if (captainCount !== numTeams) {
    errors.push(`Expected ${numTeams} captain${numTeams !== 1 ? "s" : ""}, but found ${captainCount}`);
  }

  return errors;
}
