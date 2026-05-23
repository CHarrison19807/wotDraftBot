import { completePickBanState } from "../db/pickBanAction";
import { getAvailableMaps } from "../lib/getAvailableMaps";
import type { StateWithActions } from "../types";

export async function handleFinish(state: StateWithActions): Promise<StateWithActions> {
  const remaining = getAvailableMaps(state.actions);
  const decider = remaining[Math.floor(Math.random() * remaining.length)];

  if (!decider) {
    throw new Error("No remaining maps to select decider from");
  }

  return completePickBanState(state.id, decider);
}
