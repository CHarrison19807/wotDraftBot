import { MAP_POOL } from "../constants";
import { completePickBanState } from "../db/pickBanAction";
import { PickBanStepAction } from "../generated/prisma/client";
import type { StateWithActions } from "../types";

export async function handleFinish(state: StateWithActions): Promise<StateWithActions> {
  const pickedOrBanned = new Set(
    state.actions
      .filter((a) => a.action === PickBanStepAction.MapBan || a.action === PickBanStepAction.MapPick)
      .map((a) => a.mapName),
  );

  const remaining = MAP_POOL.filter((m) => !pickedOrBanned.has(m.name));

  if (remaining.length === 0) {
    throw new Error("No remaining maps to select decider from");
  }

  const decider = remaining[Math.floor(Math.random() * remaining.length)];

  if (!decider) {
    throw new Error("Failed to select a decider map");
  }

  return completePickBanState(state.id, decider.name) as Promise<StateWithActions>;
}
