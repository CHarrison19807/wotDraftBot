import { DraftType, MapSide, WorldOfTanksMapName, WotRegion } from "../generated/prisma/client";

export function isWorldOfTanksMapName(value: string): value is WorldOfTanksMapName {
  return (Object.values(WorldOfTanksMapName) as string[]).includes(value);
}

export function isMapSide(value: string): value is MapSide {
  return (Object.values(MapSide) as string[]).includes(value);
}

export function isDraftType(value: string): value is DraftType {
  return (Object.values(DraftType) as string[]).includes(value);
}

export function isWotRegion(value: string): value is WotRegion {
  return (Object.values(WotRegion) as string[]).includes(value);
}
