import { TOMATO_GG_BASE, validRegions } from "../constants";

export function buildTomatoLink(worldOfTanksId: string, wotAccountRegion: string): string {
  const region = wotAccountRegion.trim().toLowerCase();
  const wotId = worldOfTanksId.trim();

  if (!validRegions.has(region)) {
    throw new Error(`Invalid region: ${wotAccountRegion}`);
  }
  if (!/^\d+$/.test(wotId)) {
    throw new Error(`Invalid World of Tanks ID: ${worldOfTanksId}`);
  }

  return `${TOMATO_GG_BASE}/stats/${wotId}/${region.toUpperCase()}`;
}
