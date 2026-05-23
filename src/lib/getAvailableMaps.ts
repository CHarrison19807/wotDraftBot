import { MAP_POOL } from "../constants";
import type { PickBanAction } from "../generated/prisma/client";
import { PickBanStepAction, type WorldOfTanksMapName } from "../generated/prisma/client";

export function getAvailableMaps(actions: PickBanAction[]): WorldOfTanksMapName[] {
  const used = new Set(
    actions
      .filter((a) => a.action === PickBanStepAction.MapBan || a.action === PickBanStepAction.MapPick)
      .map((a) => a.mapName),
  );
  return (Object.keys(MAP_POOL) as WorldOfTanksMapName[]).filter((m) => !used.has(m));
}
