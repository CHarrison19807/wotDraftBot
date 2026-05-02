import type { Guild } from "discord.js";
import type { RosterRow } from "./parseRoster";

export interface ResolvedPlayer {
  discordUsername: string;
  discordUserId: string;
  worldOfTanksId: string;
  isCaptain: boolean;
  isLegionnaire: boolean;
  wotAccountRegion: string;
}

export async function resolveRoster(
  guild: Guild,
  players: RosterRow[],
): Promise<{ resolved: ResolvedPlayer[]; errors: string[] }> {
  const members = await guild.members.fetch();
  const errors: string[] = [];
  const resolved: ResolvedPlayer[] = [];

  for (const player of players) {
    const member = members.find((m) => m.user.username.toLowerCase() === player.discordUsername.toLowerCase());

    if (!member) {
      errors.push(`Could not find Discord member with username "${player.discordUsername}"`);
      continue;
    }

    resolved.push({
      discordUsername: player.discordUsername,
      discordUserId: member.user.id,
      worldOfTanksId: player.worldOfTanksId,
      isCaptain: player.isCaptain,
      isLegionnaire: player.isLegionnaire,
      wotAccountRegion: player.wotAccountRegion,
    });
  }

  return { resolved, errors };
}
