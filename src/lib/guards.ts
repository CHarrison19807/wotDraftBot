import { MapSide, WorldOfTanksMapName } from "../generated/prisma/client";

export function isWorldOfTanksMapName(value: string): value is WorldOfTanksMapName {
  return (Object.values(WorldOfTanksMapName) as string[]).includes(value);
}

export function isMapSide(value: string): value is MapSide {
  return (Object.values(MapSide) as string[]).includes(value);
}
